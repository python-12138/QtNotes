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

    /// <summary>性别：male / female（饮食账本基础代谢用）</summary>
    public string? Gender { get; set; }

    /// <summary>年龄（岁）</summary>
    public int? Age { get; set; }

    /// <summary>身高（厘米）</summary>
    public double? HeightCm { get; set; }

    /// <summary>体重（公斤）</summary>
    public double? WeightKg { get; set; }

    /// <summary>活动量：sedentary 久坐 / light 轻度 / moderate 中度 / active 高强度（TDEE 用）</summary>
    public string? ActivityLevel { get; set; }

    /// <summary>不健身蛋白质（g/kg 体重）</summary>
    public double? ProteinPerKgNormal { get; set; }

    /// <summary>健身蛋白质（g/kg 体重）</summary>
    public double? ProteinPerKgFitness { get; set; }

    /// <summary>不健身脂肪占比（0-1）</summary>
    public double? FatRatioNormal { get; set; }

    /// <summary>健身脂肪占比（0-1）</summary>
    public double? FatRatioFitness { get; set; }
}
