using SqlSugar;
using QTNotes.Domain.Entities;

namespace QTNotes.Application.Query;

public interface IQueryService
{
    Task<List<Ledger>> GetLedgersAsync();
    Task<List<Transaction>> GetTransactionsAsync(string? ledgerId);
    Task<List<Trip>> GetTripsAsync(string? ledgerId);
    Task<List<Category>> GetCategoriesAsync(string? ledgerId);
    Task<List<Account>> GetAccountsAsync(string? ledgerId);
    Task<Setting?> GetSettingsAsync();
}

/// <summary>只读查询服务：供电脑端查看 UI 读取数据。</summary>
public sealed class QueryService : IQueryService
{
    private readonly ISqlSugarClient _db;

    public QueryService(ISqlSugarClient db) => _db = db;

    public Task<List<Ledger>> GetLedgersAsync()
        => _db.Queryable<Ledger>().OrderBy(x => x.CreatedAt).ToListAsync();

    public Task<List<Transaction>> GetTransactionsAsync(string? ledgerId)
    {
        var q = _db.Queryable<Transaction>();
        if (!string.IsNullOrEmpty(ledgerId))
            q = q.Where(x => x.LedgerId == ledgerId);
        return q.OrderBy(x => x.Date, OrderByType.Desc)
                .OrderBy(x => x.CreatedAt, OrderByType.Desc)
                .ToListAsync();
    }

    public Task<List<Trip>> GetTripsAsync(string? ledgerId)
    {
        var q = _db.Queryable<Trip>();
        if (!string.IsNullOrEmpty(ledgerId))
            q = q.Where(x => x.LedgerId == ledgerId);
        return q.OrderBy(x => x.Date, OrderByType.Desc)
                .OrderBy(x => x.CreatedAt, OrderByType.Desc)
                .ToListAsync();
    }

    public Task<List<Category>> GetCategoriesAsync(string? ledgerId)
    {
        var q = _db.Queryable<Category>();
        if (!string.IsNullOrEmpty(ledgerId))
            q = q.Where(x => x.LedgerId == ledgerId);
        return q.OrderBy(x => x.CreatedAt).ToListAsync();
    }

    public Task<List<Account>> GetAccountsAsync(string? ledgerId)
    {
        var q = _db.Queryable<Account>();
        if (!string.IsNullOrEmpty(ledgerId))
            q = q.Where(x => x.LedgerId == ledgerId);
        return q.OrderBy(x => x.CreatedAt).ToListAsync();
    }

    public async Task<Setting?> GetSettingsAsync()
        => await _db.Queryable<Setting>().FirstAsync();
}
