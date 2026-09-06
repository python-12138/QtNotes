using SqlSugar;

namespace QTNotes.Domain.Entities;

/// <summary>每次行驶记录（车辆账本独立模块：本次距离 + 升数）</summary>
[SugarTable("trips")]
public class Trip : EntityBase
{
    public string LedgerId { get; set; } = string.Empty;

    /// <summary>业务日期，'YYYY-MM-DD'</summary>
    public string Date { get; set; } = string.Empty;

    /// <summary>本次行驶距离（km）</summary>
    public double Km { get; set; }

    /// <summary>本次使用升数（L）</summary>
    public double Liters { get; set; }
}
