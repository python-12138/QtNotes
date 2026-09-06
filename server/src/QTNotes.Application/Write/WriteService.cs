using SqlSugar;
using QTNotes.Domain.Entities;

namespace QTNotes.Application.Write;

/// <summary>新建账本的请求：账本 + 播种的分类与账户（客户端已生成 id/createdAt）</summary>
public sealed class CreateLedgerRequest
{
    public Ledger Ledger { get; set; } = new();
    public List<Category> Categories { get; set; } = new();
    public List<Account> Accounts { get; set; } = new();
}

public interface IWriteService
{
    Task<Ledger> CreateLedgerAsync(CreateLedgerRequest request);
    Task UpdateLedgerAsync(Ledger ledger);
    Task DeleteLedgerAsync(string id);

    Task CreateCategoryAsync(Category category);
    Task UpdateCategoryAsync(Category category);
    Task<bool> DeleteCategoryAsync(string id);   // false = 被流水引用，拒绝删除（409）

    Task CreateAccountAsync(Account account);
    Task UpdateAccountAsync(Account account);
    Task<bool> DeleteAccountAsync(string id);    // false = 被流水引用，拒绝删除（409）

    Task CreateTransactionAsync(Transaction transaction);
    Task UpdateTransactionAsync(Transaction transaction);
    Task DeleteTransactionAsync(string id);

    Task CreateTripAsync(Trip trip);
    Task UpdateTripAsync(Trip trip);
    Task DeleteTripAsync(string id);

    Task UpsertSettingsAsync(Setting setting);
}

/// <summary>
/// 写服务：电脑端对 MySQL 的逐实体增删改。
/// 全部采用软删除（置 DeletedAt），Id/CreatedAt 由客户端生成，UpdatedAt 由服务端维护。
/// </summary>
public sealed class WriteService : IWriteService
{
    private readonly ISqlSugarClient _db;

    public WriteService(ISqlSugarClient db) => _db = db;

    private static long Now() => DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();

    public async Task<Ledger> CreateLedgerAsync(CreateLedgerRequest request)
    {
        var now = Now();
        var ledger = request.Ledger;
        ledger.UpdatedAt = now;
        ledger.DeletedAt = null;
        var categories = request.Categories;
        var accounts = request.Accounts;
        foreach (var c in categories) { c.UpdatedAt = now; c.DeletedAt = null; }
        foreach (var a in accounts) { a.UpdatedAt = now; a.DeletedAt = null; }

        try
        {
            _db.Ado.BeginTran();
            await _db.Insertable(ledger).ExecuteCommandAsync();
            if (categories.Count > 0) await _db.Insertable(categories).ExecuteCommandAsync();
            if (accounts.Count > 0) await _db.Insertable(accounts).ExecuteCommandAsync();
            _db.Ado.CommitTran();
        }
        catch
        {
            _db.Ado.RollbackTran();
            throw;
        }
        return ledger;
    }

    public async Task UpdateLedgerAsync(Ledger ledger)
    {
        ledger.UpdatedAt = Now();
        ledger.DeletedAt = null;
        await _db.Updateable(ledger).ExecuteCommandAsync();
    }

    public async Task DeleteLedgerAsync(string id)
    {
        var now = Now();
        try
        {
            _db.Ado.BeginTran();
            await SoftDelete<Ledger>(id, now);
            await _db.Updateable<Transaction>()
                .SetColumns(x => x.DeletedAt == now)
                .SetColumns(x => x.UpdatedAt == now)
                .Where(x => x.LedgerId == id).ExecuteCommandAsync();
            await _db.Updateable<Category>()
                .SetColumns(x => x.DeletedAt == now)
                .SetColumns(x => x.UpdatedAt == now)
                .Where(x => x.LedgerId == id).ExecuteCommandAsync();
            await _db.Updateable<Account>()
                .SetColumns(x => x.DeletedAt == now)
                .SetColumns(x => x.UpdatedAt == now)
                .Where(x => x.LedgerId == id).ExecuteCommandAsync();
            await _db.Updateable<Trip>()
                .SetColumns(x => x.DeletedAt == now)
                .SetColumns(x => x.UpdatedAt == now)
                .Where(x => x.LedgerId == id).ExecuteCommandAsync();
            _db.Ado.CommitTran();
        }
        catch
        {
            _db.Ado.RollbackTran();
            throw;
        }
    }

    public async Task CreateCategoryAsync(Category category)
    {
        category.UpdatedAt = Now();
        category.DeletedAt = null;
        await _db.Insertable(category).ExecuteCommandAsync();
    }

    public async Task UpdateCategoryAsync(Category category)
    {
        category.UpdatedAt = Now();
        category.DeletedAt = null;
        await _db.Updateable(category).ExecuteCommandAsync();
    }

    public async Task<bool> DeleteCategoryAsync(string id)
    {
        var used = await _db.Queryable<Transaction>()
            .Where(x => x.CategoryId == id && x.DeletedAt == null)
            .AnyAsync();
        if (used) return false;
        await SoftDelete<Category>(id, Now());
        return true;
    }

    public async Task CreateAccountAsync(Account account)
    {
        account.UpdatedAt = Now();
        account.DeletedAt = null;
        await _db.Insertable(account).ExecuteCommandAsync();
    }

    public async Task UpdateAccountAsync(Account account)
    {
        account.UpdatedAt = Now();
        account.DeletedAt = null;
        await _db.Updateable(account).ExecuteCommandAsync();
    }

    public async Task<bool> DeleteAccountAsync(string id)
    {
        var used = await _db.Queryable<Transaction>()
            .Where(x => x.AccountId == id && x.DeletedAt == null)
            .AnyAsync();
        if (used) return false;
        await SoftDelete<Account>(id, Now());
        return true;
    }

    public async Task CreateTransactionAsync(Transaction transaction)
    {
        transaction.UpdatedAt = Now();
        transaction.DeletedAt = null;
        await _db.Insertable(transaction).ExecuteCommandAsync();
    }

    public async Task UpdateTransactionAsync(Transaction transaction)
    {
        transaction.UpdatedAt = Now();
        transaction.DeletedAt = null;
        await _db.Updateable(transaction).ExecuteCommandAsync();
    }

    public async Task DeleteTransactionAsync(string id)
    {
        await SoftDelete<Transaction>(id, Now());
    }

    public async Task CreateTripAsync(Trip trip)
    {
        trip.UpdatedAt = Now();
        trip.DeletedAt = null;
        await _db.Insertable(trip).ExecuteCommandAsync();
    }

    public async Task UpdateTripAsync(Trip trip)
    {
        trip.UpdatedAt = Now();
        trip.DeletedAt = null;
        await _db.Updateable(trip).ExecuteCommandAsync();
    }

    public async Task DeleteTripAsync(string id)
    {
        await SoftDelete<Trip>(id, Now());
    }

    public async Task UpsertSettingsAsync(Setting setting)
    {
        setting.UpdatedAt = Now();
        setting.DeletedAt = null;
        var existing = await _db.Queryable<Setting>().Where(x => x.Id == setting.Id).FirstAsync();
        if (existing == null)
            await _db.Insertable(setting).ExecuteCommandAsync();
        else
            await _db.Updateable(setting).ExecuteCommandAsync();
    }

    private Task<int> SoftDelete<T>(string id, long now) where T : EntityBase, new()
        => _db.Updateable<T>()
              .SetColumns(x => x.DeletedAt == now)
              .SetColumns(x => x.UpdatedAt == now)
              .Where(x => x.Id == id)
              .ExecuteCommandAsync();
}
