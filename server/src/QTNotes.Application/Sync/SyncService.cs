using SqlSugar;
using QTNotes.Domain.Entities;

namespace QTNotes.Application.Sync;

/// <summary>手机端全量快照：与 app/ 端导出的数据结构一一对应</summary>
public sealed class SyncPayload
{
    public List<Ledger> Ledgers { get; set; } = new();
    public List<Transaction> Transactions { get; set; } = new();
    public List<Category> Categories { get; set; } = new();
    public List<Account> Accounts { get; set; } = new();
    public List<Trip> Trips { get; set; } = new();
    public List<Setting> Settings { get; set; } = new();
}

/// <summary>同步结果统计</summary>
public sealed record SyncResult(
    int Ledgers,
    int Transactions,
    int Categories,
    int Accounts,
    int Trips,
    int Settings,
    long SyncedAt);

public interface ISyncService
{
    Task<SyncResult> MirrorAsync(SyncPayload payload);
}

/// <summary>
/// 单向镜像同步：手机端是唯一数据源，服务端数据库逐表按 Id 去重 upsert，
/// 并删除手机端已不存在的记录（硬删除，等价于「服务端镜像手机端」）。
/// 幂等——重复同步结果一致，可放心重试。
/// </summary>
public sealed class SyncService : ISyncService
{
    private readonly ISqlSugarClient _db;

    public SyncService(ISqlSugarClient db) => _db = db;

    public async Task<SyncResult> MirrorAsync(SyncPayload payload)
    {
        var now = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();

        var ledgers = await MirrorAsync(payload.Ledgers, now);
        var transactions = await MirrorAsync(payload.Transactions, now);
        var categories = await MirrorAsync(payload.Categories, now);
        var accounts = await MirrorAsync(payload.Accounts, now);
        var trips = await MirrorAsync(payload.Trips, now);
        var settings = await MirrorAsync(payload.Settings, now);

        return new SyncResult(ledgers, transactions, categories, accounts, trips, settings, now);
    }

    private async Task<int> MirrorAsync<TEntity>(List<TEntity>? incoming, long now)
        where TEntity : EntityBase, new()
    {
        incoming ??= new List<TEntity>();

        // 时间戳：记录仍存在于手机端（DeletedAt 置空）
        foreach (var item in incoming)
        {
            item.UpdatedAt = now;
            item.DeletedAt = null;
        }

        var incomingIds = incoming.Select(x => x.Id).ToList();

        // 空快照 = 手机端已无此表数据，清空该表
        if (incomingIds.Count == 0)
        {
            await _db.Deleteable<TEntity>().ExecuteCommandAsync();
            return 0;
        }

        var existingIds = await _db.Queryable<TEntity>().Select(x => x.Id).ToListAsync();

        // 新增 / 更新（按主键 Id 去重）
        var toInsert = incoming.Where(x => !existingIds.Contains(x.Id)).ToList();
        var toUpdate = incoming.Where(x => existingIds.Contains(x.Id)).ToList();
        if (toInsert.Count > 0)
            await _db.Insertable(toInsert).ExecuteCommandAsync();
        if (toUpdate.Count > 0)
            await _db.Updateable(toUpdate).ExecuteCommandAsync();

        // 删除手机端已删除、但服务端仍残留的记录（单向镜像）
        var toDelete = existingIds.Where(id => !incomingIds.Contains(id)).ToList();
        if (toDelete.Count > 0)
            await _db.Deleteable<TEntity>().Where(x => toDelete.Contains(x.Id)).ExecuteCommandAsync();

        return incoming.Count;
    }
}
