using SqlSugar;

namespace QTNotes.Domain.Entities;

/// <summary>流水（一笔账目）</summary>
[SugarTable("transactions")]
public class Transaction : EntityBase
{
    public string LedgerId { get; set; } = string.Empty;

    /// <summary>收支类型：income / expense</summary>
    public string Type { get; set; } = "expense";

    /// <summary>金额（单位：分，整数）</summary>
    public long Amount { get; set; }

    public string CategoryId { get; set; } = string.Empty;

    public string AccountId { get; set; } = string.Empty;

    /// <summary>业务日期，'YYYY-MM-DD'</summary>
    public string Date { get; set; } = string.Empty;

    [SugarColumn(Length = 255)]
    public string Note { get; set; } = string.Empty;

    /// <summary>油号（仅车辆账本「油费」分类时才有）：92#/95#/98#/柴油/充电…</summary>
    [SugarColumn(IsNullable = true)]
    public string? FuelType { get; set; }

    /// <summary>加油时里程表读数（总里程 km）</summary>
    [SugarColumn(IsNullable = true)]
    public double? Km { get; set; }
}
