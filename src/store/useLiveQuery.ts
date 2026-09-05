import { liveQuery } from 'dexie';
import { ref, watch, onScopeDispose, type Ref, type WatchSource } from 'vue';

// 把 Dexie 的 liveQuery（响应式查询）桥接成 Vue 的 ref。
// querier 返回查询结果；deps 变化时（如切换账本 currentLedgerId）重新订阅，
// 数据写入 IndexedDB 时 Dexie 会自动触发更新。
export function useLiveQuery<T>(
  querier: () => T | Promise<T>,
  deps: WatchSource[] = [],
): Ref<T | undefined> {
  const result = ref<T | undefined>();
  let sub: { unsubscribe(): void } | undefined;

  watch(
    deps,
    () => {
      sub?.unsubscribe();
      sub = liveQuery(querier).subscribe({
        next: (v) => {
          result.value = v;
        },
        error: (e) => console.error('查询失败', e),
      });
    },
    { immediate: true },
  );

  // 组件卸载时取消订阅，避免内存泄漏
  onScopeDispose(() => sub?.unsubscribe());
  return result;
}
