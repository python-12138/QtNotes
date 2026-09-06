using System.Text.Json;
using SqlSugar;
using QTNotes.Application;
using QTNotes.Application.Query;
using QTNotes.Application.Sync;
using QTNotes.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

// 连接串：优先环境变量 ConnectionStrings__Default，其次 appsettings.json
var connectionString = builder.Configuration.GetConnectionString("Default")
    ?? "Server=127.0.0.1;Port=3306;Database=qtnotes;User=root;Password=CHANGE_ME;CharSet=utf8mb4;";

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

// —— 同步（写）：手机端 → 服务端，按 Id 去重镜像 ——
app.MapPost("/api/sync", async (SyncPayload payload, ISyncService sync) =>
    Results.Ok(await sync.MirrorAsync(payload)));

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
