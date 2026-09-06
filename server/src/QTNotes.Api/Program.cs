using System.Text.Json;
using SqlSugar;
using QTNotes.Application;
using QTNotes.Application.Query;
using QTNotes.Application.Sync;
using QTNotes.Application.Write;
using QTNotes.Domain.Entities;
using QTNotes.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

// 连接串：优先环境变量 ConnectionStrings__Default，其次 appsettings.json
var connectionString = builder.Configuration.GetConnectionString("Default")
    ?? "Server=127.0.0.1;Port=3306;Database=qtnotes;User=root;Password=CHANGE_ME;CharSet=utf8mb4;AllowPublicKeyRetrieval=true;SslMode=None;";

builder.Services.AddInfrastructure(connectionString);
builder.Services.AddApplication();

// JSON：输出 camelCase、输入忽略大小写，与手机端字段对齐
builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
    options.SerializerOptions.PropertyNameCaseInsensitive = true;
});

// 本地个人应用：允许任意来源（手机 PWA / 电脑查看器跨域调用）
builder.Services.AddCors(options =>
{
    options.AddPolicy("allowAll", p => p.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod());
});

var app = builder.Build();

// 启动时代码先行建库建表（失败不阻塞启动，便于排查连接串问题）
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<ISqlSugarClient>();
    try
    {
        DatabaseInitializer.Initialize(db);
        app.Logger.LogInformation("数据库初始化完成（SqlSugar 代码先行）");
    }
    catch (Exception ex)
    {
        app.Logger.LogWarning(ex, "数据库初始化失败（请检查 MySQL 连接串），服务仍会启动");
    }
}

app.UseCors("allowAll");

// —— 同步（写）：手机端 → 服务端，墓碑同步 ——
app.MapPost("/api/sync", async (SyncPayload payload, ISyncService sync) =>
    Results.Ok(await sync.MirrorAsync(payload)));

// —— 反向通道预留：手机端从服务端拉取变更（本期仅占位，返回 501，供未来双向同步拓展） ——
app.MapGet("/api/sync/changes", (long? since) => Results.StatusCode(501));

// —— 写（电脑端）：逐实体 REST CRUD，全部软删，UpdatedAt 由服务端维护 ——
app.MapPost("/api/ledgers", async (CreateLedgerRequest req, IWriteService w) =>
{
    var ledger = await w.CreateLedgerAsync(req);
    return Results.Created($"/api/ledgers/{ledger.Id}", ledger);
});
app.MapPut("/api/ledgers/{id}", async (string id, Ledger ledger, IWriteService w) =>
{
    ledger.Id = id;
    await w.UpdateLedgerAsync(ledger);
    return Results.NoContent();
});
app.MapDelete("/api/ledgers/{id}", async (string id, IWriteService w) =>
{
    await w.DeleteLedgerAsync(id);
    return Results.NoContent();
});

app.MapPost("/api/categories", async (Category c, IWriteService w) =>
{
    await w.CreateCategoryAsync(c);
    return Results.Created($"/api/categories/{c.Id}", c);
});
app.MapPut("/api/categories/{id}", async (string id, Category c, IWriteService w) =>
{
    c.Id = id;
    await w.UpdateCategoryAsync(c);
    return Results.NoContent();
});
app.MapDelete("/api/categories/{id}", async (string id, IWriteService w) =>
{
    var ok = await w.DeleteCategoryAsync(id);
    return ok ? Results.NoContent() : Results.Conflict();
});

app.MapPost("/api/accounts", async (Account a, IWriteService w) =>
{
    await w.CreateAccountAsync(a);
    return Results.Created($"/api/accounts/{a.Id}", a);
});
app.MapPut("/api/accounts/{id}", async (string id, Account a, IWriteService w) =>
{
    a.Id = id;
    await w.UpdateAccountAsync(a);
    return Results.NoContent();
});
app.MapDelete("/api/accounts/{id}", async (string id, IWriteService w) =>
{
    var ok = await w.DeleteAccountAsync(id);
    return ok ? Results.NoContent() : Results.Conflict();
});

app.MapPost("/api/transactions", async (Transaction t, IWriteService w) =>
{
    await w.CreateTransactionAsync(t);
    return Results.Created($"/api/transactions/{t.Id}", t);
});
app.MapPut("/api/transactions/{id}", async (string id, Transaction t, IWriteService w) =>
{
    t.Id = id;
    await w.UpdateTransactionAsync(t);
    return Results.NoContent();
});
app.MapDelete("/api/transactions/{id}", async (string id, IWriteService w) =>
{
    await w.DeleteTransactionAsync(id);
    return Results.NoContent();
});

app.MapPost("/api/trips", async (Trip t, IWriteService w) =>
{
    await w.CreateTripAsync(t);
    return Results.Created($"/api/trips/{t.Id}", t);
});
app.MapPut("/api/trips/{id}", async (string id, Trip t, IWriteService w) =>
{
    t.Id = id;
    await w.UpdateTripAsync(t);
    return Results.NoContent();
});
app.MapDelete("/api/trips/{id}", async (string id, IWriteService w) =>
{
    await w.DeleteTripAsync(id);
    return Results.NoContent();
});

app.MapPut("/api/settings", async (Setting s, IWriteService w) =>
{
    await w.UpsertSettingsAsync(s);
    return Results.Ok();
});

// —— 只读查询：供电脑端查看 UI 使用 ——
app.MapGet("/api/ledgers", (IQueryService q) => q.GetLedgersAsync());
app.MapGet("/api/transactions", (string? ledgerId, IQueryService q) => q.GetTransactionsAsync(ledgerId));
app.MapGet("/api/trips", (string? ledgerId, IQueryService q) => q.GetTripsAsync(ledgerId));
app.MapGet("/api/categories", (string? ledgerId, IQueryService q) => q.GetCategoriesAsync(ledgerId));
app.MapGet("/api/accounts", (string? ledgerId, IQueryService q) => q.GetAccountsAsync(ledgerId));
app.MapGet("/api/settings", async (IQueryService q) => Results.Ok(await q.GetSettingsAsync()));
app.MapGet("/api/health", () => Results.Ok(new { status = "ok", time = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() }));

// 托管电脑端查看 UI（web/ 构建产物放在 wwwroot）
app.UseDefaultFiles();
app.UseStaticFiles();

app.Run();
