using Microsoft.Extensions.DependencyInjection;
using SqlSugar;

namespace QTNotes.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, string connectionString)
    {
        // SqlSugarScope：线程安全，注册为进程内单例
        services.AddSingleton<ISqlSugarClient>(_ => new SqlSugarScope(new ConnectionConfig
        {
            ConnectionString = connectionString,
            DbType = DbType.MySql,
            IsAutoCloseConnection = true,
            InitKeyType = InitKeyType.Attribute,
        }));

        return services;
    }
}
