// ECharts 按需注册：只引入用到的图表与组件，减小打包体积。
// 在 main.ts 里 import 本文件一次即可全局生效。
import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { PieChart, BarChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components';

use([CanvasRenderer, PieChart, BarChart, GridComponent, TooltipComponent, LegendComponent]);
