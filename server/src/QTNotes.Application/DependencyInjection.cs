using Microsoft.Extensions.DependencyInjection;
using QTNotes.Application.Query;
using QTNotes.Application.Sync;

namespace QTNotes.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddScoped<ISyncService, SyncService>();
        services.AddScoped<IQueryService, QueryService>();
        return services;
    }
}
