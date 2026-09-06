using Microsoft.Extensions.DependencyInjection;
using QTNotes.Application.Query;
using QTNotes.Application.Sync;
using QTNotes.Application.Write;

namespace QTNotes.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddScoped<ISyncService, SyncService>();
        services.AddScoped<IQueryService, QueryService>();
        services.AddScoped<IWriteService, WriteService>();
        return services;
    }
}
