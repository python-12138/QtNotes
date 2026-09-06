using SqlSugar;

namespace QTNotes.Domain.Entities;

/// <summary>全局设置（单行，id 固定为 'main'）</summary>
[SugarTable("settings")]
public class Setting : EntityBase
{
    /// <summary>历史累计油费（分），作为每公里费用起点</summary>
    public long FuelBaselineAmount { get; set; }

    /// <summary>历史累计总里程（km），作为每公里费用起点</summary>
    public double FuelBaselineKm { get; set; }

    /// <summary>油价接口：省份</summary>
    public string OilProvince { get; set; } = string.Empty;

    /// <summary>默认油号：92# / 95# / 98# / 柴油</summary>
    public string OilGrade { get; set; } = string.Empty;

    /// <summary>接口 app_id</summary>
    public string OilAppId { get; set; } = string.Empty;

    /// <summary>接口 app_secret</summary>
    public string OilAppSecret { get; set; } = string.Empty;

    /// <summary>当前单价（元/升），0 表示未设置</summary>
    public double OilPrice { get; set; }

    /// <summary>最近一次获取单价的时间戳（毫秒）</summary>
    public long OilPriceUpdatedAt { get; set; }
}
