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
/// 单向墓碑同步：手机端仍是唯一写源，但服务端不再硬删/清表。
/// 存活行（DeletedAt 为空）按 Id 去重 upsert；墓碑行（DeletedAt 非空）仅对已存在的 Id 置软删标记。
/// 服务端独有的行（如电脑端新增）与手机端空快照都不会被清除，从而保留电脑端数据。
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

        // 拆分为「存活行」与「墓碑行」：软删行带 DeletedAt，服务端据此标记删除而非硬删
        var alive = incoming.Where(x => x.DeletedAt == null).ToList();
        var tombstones = incoming.Where(x => x.DeletedAt != null).ToList();

        // 存活行：时间戳归一（UpdatedAt 服务端 touch，DeletedAt 置空）
        foreach (var item in alive)
        {
            item.UpdatedAt = now;
            item.DeletedAt = null;
        }

        var existingIds = await _db.Queryable<TEntity>().Select(x => x.Id).ToListAsync();

        // 存活行按主键 Id 去重 upsert
        var toInsert = alive.Where(x => !existingIds.Contains(x.Id)).ToList();
        var toUpdate = alive.Where(x => existingIds.Contains(x.Id)).ToList();
        if (toInsert.Count > 0)
            await _db.Insertable(toInsert).ExecuteCommandAsync();
        if (toUpdate.Count > 0)
            await _db.Updateable(toUpdate).ExecuteCommandAsync();

        // 墓碑行：仅对服务端已存在的 Id 置软删标记（不硬删、不插入新行）。
        // 服务端独有的行（电脑端新增）与手机端空快照都不做任何处理，从而保留电脑端数据。
        var tombstoneIds = tombstones.Select(x => x.Id).Where(existingIds.Contains).ToList();
        if (tombstoneIds.Count > 0)
        {
            await _db.Updateable<TEntity>()
                .SetColumns(x => x.DeletedAt == now)
                .SetColumns(x => x.UpdatedAt == now)
                .Where(x => tombstoneIds.Contains(x.Id))
                .ExecuteCommandAsync();
        }

        return alive.Count + tombstones.Count;
    }
}
