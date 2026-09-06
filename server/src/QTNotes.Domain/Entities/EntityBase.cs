using SqlSugar;

namespace QTNotes.Domain.Entities;

/// <summary>
/// 所有实体的公共基类：主键 + 审计字段 + 预留扩展字段。
/// 时间戳统一用「毫秒」整数（与手机端 IndexedDB 的 createdAt 保持一致，避免时区/序列化问题）。
/// </summary>
public abstract class EntityBase
{
    /// <summary>主键：手机端生成的全局唯一 id（UUID 或降级字符串）</summary>
    [SugarColumn(IsPrimaryKey = true, Length = 64)]
    public string Id { get; set; } = string.Empty;

    /// <summary>创建时间（毫秒时间戳，来自手机端）</summary>
    public long CreatedAt { get; set; }

    /// <summary>最近同步/修改时间（毫秒时间戳，服务端维护）</summary>
    public long UpdatedAt { get; set; }

    /// <summary>软删除时间戳（预留字段：双向同步用；单向镜像暂不启用）</summary>
    [SugarColumn(IsNullable = true)]
    public long? DeletedAt { get; set; }

    /// <summary>预留扩展字段（JSON 文本），方便后续扩展而无需改表结构</summary>
    [SugarColumn(ColumnDataType = "longtext", IsNullable = true)]
    public string? Extra { get; set; }
}
