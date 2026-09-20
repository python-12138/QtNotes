// 命令式确认弹窗：confirmDialog(...) 返回 Promise<boolean>，可直接替换原生 confirm()。
// 通过 createApp 动态挂载一个 ConfirmDialog 到 body，用户点「确定」resolve(true)、「取消」resolve(false)。
import { createApp, h } from 'vue';
import ConfirmDialog from '../components/ConfirmDialog.vue';

export type DialogType = 'info' | 'warning' | 'error' | 'success';

export interface ConfirmOptions {
  type?: DialogType; // 弹窗级别：info 提示 / warning 警告 / error 错误 / success 成功
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  showCancel?: boolean; // 是否显示取消按钮（纯提示时传 false）
}

export function confirmDialog(options: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    const mount = document.createElement('div');
    document.body.appendChild(mount);
    const app = createApp({
      render() {
        return h(ConfirmDialog, {
          ...options,
          onConfirm: () => {
            cleanup();
            resolve(true);
          },
          onCancel: () => {
            cleanup();
            resolve(false);
          },
        });
      },
    });
    const cleanup = () => {
      app.unmount();
      mount.remove();
    };
    app.mount(mount);
  });
}
