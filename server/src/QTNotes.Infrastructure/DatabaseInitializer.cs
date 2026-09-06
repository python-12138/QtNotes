using SqlSugar;
using QTNotes.Domain.Entities;

namespace QTNotes.Infrastructure;

/// <summary>
/// 代码先行建库：确保数据库存在，再按实体建表（表不存在则建、已有则补列）。
/// </summary>
public static class DatabaseInitializer
{
    public static void Initialize(ISqlSugarClient db)
    {
        // 1) 确保数据库存在。SqlSugar 没有「判断库是否存在」的接口，直接尝试建库：
        //    库已存在（或当前账号无建库权限）时会抛错，这里忽略；真正的连接问题会由下方 InitTables 上抛。
        try
        {
            db.DbMaintenance.CreateDatabase();
        }
        catch
        {
            // 忽略：库已存在，或账号无建库权限
        }

        // 2) 字符串列默认长度 64（Note / Extra 等已显式标注的除外）
        db.CodeFirst.SetStringDefaultLength(64);

        // 3) 按实体建表
        db.CodeFirst.InitTables(
            typeof(Ledger),
            typeof(Transaction),
            typeof(Category),
            typeof(Account),
            typeof(Trip),
            typeof(Setting));
    }
}
