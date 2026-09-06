using SqlSugar;

namespace QTNotes.Domain.Entities;

/// <summary>账本（一本账一个独立记账空间）</summary>
[SugarTable("ledgers")]
public class Ledger : EntityBase
{
    public string Name { get; set; } = string.Empty;

    /// <summary>账本类型：general 普通 / vehicle 用车费用</summary>
    public string Type { get; set; } = "general";

    /// <summary>图标（emoji）</summary>
    public string Icon { get; set; } = string.Empty;

    /// <summary>颜色（hex）</summary>
    public string Color { get; set; } = string.Empty;
}
