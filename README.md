# zolist — ZeppOS 官方风格列表控件 / ZeppOS Official List Control

[中文](#中文) | [English](#english)

---

## 中文

### 是什么

**zolist** 将 ZeppOS 官方列表页常见的页面结构封装成一个页面级组合控件，适合需要官方风格列表、物理按键焦点、触屏点击、表冠/滚轮滚动和圆屏/方屏适配的小程序页面：

1. **官方风格行布局** — `TEXT` / `SWITCH` / `CHECKBOX` / `RADIO` / `CATEGORY` / `FOOTER` / `IMAGE`
2. **物理按键焦点** — UP/DOWN 环绕导航，SELECT/HOME 触发当前项
3. **触屏反馈** — 可点击项带按下遮罩，图片项带独立双描边焦点
4. **滚动落焦** — 手指滑动或表冠/滚轮滚动结束后，焦点落到屏幕中心附近的条目
5. **圆屏/方屏自动适配** — 根据 `getDeviceInfo().screenShape` 自动选择 layout profile，并按屏幕宽度缩放

它不是 ZeppOS 官方内置 widget，但使用方式刻意接近官方 `createWidget(widget.X, Param)`：

```js
const list = createListPage(Param)
const item = list.createWidget(listWidget.SWITCH, RowParam)
```

### 安装

```bash
# npm
npm install @zh40s05/zepp-official-list

# 手动复制
cp zolist.js your-app/utils/zolist.js
```

资源文件需要放入小程序 `assets/default.r/`。如果同时支持方屏目标，也需要放入 `assets/default.s/`。

### 快速开始

```js
import { showToast } from '@zos/interaction'
import { createListPage, listWidget } from '../utils/zolist'

Page({
  build() {
    const list = createListPage({
      header: { text: '设置' },
      footer: { button: true, click_func: () => showToast({ content: '帮助' }) },
    })

    list.createWidget(listWidget.TEXT, {
      title: '普通文本条目',
    })

    list.createWidget(listWidget.TEXT, {
      title: '可点击文本条目',
      clickable: true,
      click_func: () => showToast({ content: '点击' }),
    })

    list.createWidget(listWidget.SWITCH, {
      title: '开关条目',
      checked: true,
      checked_change_func: (checked) => showToast({ content: checked ? '开' : '关' }),
    })

    list.mount()
    this.list = list
  },
})
```

`mount()` 会创建默认 footer、焦点层、点击遮罩并注册物理按键。通常在所有 `createWidget()` 调用完成后执行一次。

### API

| 导出 | 说明 |
|---|---|
| `createListPage(param)` | 创建列表页面控件 |
| `listWidget` | 子控件类型常量，类似官方 `widget` |
| `listProp` | 属性常量，用于 `getProperty` / `setProperty` |
| `ListPage` | 列表页面类，通常不需要直接实例化 |
| `zolistDispose()` | 手动清理当前列表实例；一般只在高级场景使用 |

### createListPage 参数

| 参数 | 说明 | 默认 |
|---|---|---|
| `header` | 页头配置；传 `false` 不创建 header | 不创建 |
| `footer` | 页脚配置；传 `false` 不创建 footer | `{}` |
| `hideStatusBar` | 创建页面时调用 `setStatusBarVisible(false)` 隐藏系统状态栏；传 `false` 保持状态栏当前可见性 | `true` |
| `touchScrollStep` | 触屏 `scroll_frame_func.yoffset` 到内部滚动位置的倍率；调节手指滑动落焦距离 | `1` |
| `crownEnable` | 是否注册 `onDigitalCrown` 处理表冠/滚轮滚动 | `true` |
| `crownStep` | 表冠/滚轮 `degree` 到滚动像素的倍率；数值越大滚轮滚动越快 | `2.5` |
| `crownSettleMs` | 表冠/滚轮停止后等待多久重建焦点 | `180` |
| `crownVibrate` | 表冠停止后中心条目发生切换时振动；新 API 为 20ms 短强，旧 API 为实测短中降级 | `true` |
| `debugScroll` | 输出 `[ZOList.scroll]` 诊断日志 | `false` |

公开 API 不提供 `x/y/w/h`。列表始终从 `x=0, y=0` 开始，宽高由当前屏幕 profile 决定。若你选择 `hideStatusBar: false` 并需要避让状态栏，可以在列表顶部插入 `SPACER`。

表冠振动使用能力检测，而不是硬编码系统版本：支持 API_LEVEL 3.6 场景 API 时，优先调用 `getType()` 并以 `STRONG_SHORT` 场景振动 20ms；接口缺失或调用失败时，回退到 API_LEVEL 2.0 的 `setMode(VIBRATOR_SCENE_DURATION)` → `start()`。后者来自 Shimmer 在受影响旧固件上的实测映射，实际为短中振动，是有意的兼容降级。旧 mode 映射的具体修复版本尚未确认。

```js
const list = createListPage({
  hideStatusBar: false,
  header: false,
})

list.createWidget(listWidget.SPACER, { h: 64 })
```

滚动倍率可直接在 `createListPage()` 中调整：

```js
const list = createListPage({
  touchScrollStep: 1,  // 触屏滑动倍率，默认 1
  crownStep: 2.5,     // 表冠/滚轮倍率，默认 2.5
  crownVibrate: true, // 新系统短强、旧系统实测短中降级，默认开启
})
```

### HeaderParam

| 参数 | 说明 |
|---|---|
| `text` | 页头标题 |
| `subtitle` | 页头副标题；传入后使用复合标题布局 |
| `text_i18n` | 页头标题 i18n 文本 |
| `subtitle_i18n` | 页头副标题 i18n 文本 |
| `text_style` | 标题/副标题统一文字布局样式 |
| `title_text_style` | 标题文字布局样式，优先级高于 `text_style` |
| `subtitle_text_style` | 副标题文字布局样式，优先级高于 `text_style` |

### FooterParam

| 参数 | 说明 | 默认 |
|---|---|---|
| `button` | 是否显示居中的帮助按钮 | `false` |
| `click_func` | 帮助按钮点击/确认回调 | noop |

Footer 高度会随 layout profile 变化：圆屏基准 `188px`，方屏基准 `84px`。默认 footer 不只是可选按钮区域，也承担底部安全留白，避免最后一屏内容被系统底部区域截断；没有帮助按钮需求时保留默认 `footer: {}` 即可。只有在你自行追加等效底部 `SPACER` 或完全自定义页面底部时，才建议传 `footer: false`。

### listWidget

| 值 | 说明 |
|---|---|
| `listWidget.TEXT` | 文本条目；可展示、可点击、可带左侧图标和右箭头 |
| `listWidget.SWITCH` | 开关条目 |
| `listWidget.CHECKBOX` | 复选框条目 |
| `listWidget.RADIO` | 单选框条目 |
| `listWidget.CATEGORY` | 分类说明文字 |
| `listWidget.IMAGE` | 居中图片条目 |
| `listWidget.FOOTER` | 手动插入 footer |
| `listWidget.SPACER` | 手动插入垂直留白 |

`TEXT` / `SWITCH` / `CHECKBOX` / `RADIO` / `IMAGE` 返回 `ListItem`。`CATEGORY` / `FOOTER` / `SPACER` 返回当前 `ListPage`，便于链式继续创建。

### RowParam

适用于 `TEXT` / `SWITCH` / `CHECKBOX` / `RADIO`。

| 参数 | 说明 |
|---|---|
| `title` | 主标题 |
| `subtitle` | 副标题；传入后自动使用复合标题行 |
| `title_i18n` | 主标题 i18n 文本 |
| `subtitle_i18n` | 副标题 i18n 文本 |
| `text_style` | 主/副标题统一文字布局样式，默认 `text_style.WRAP` |
| `title_text_style` | 主标题文字布局样式，优先级高于 `text_style` |
| `subtitle_text_style` | 副标题文字布局样式，优先级高于 `text_style` |
| `icon` | 左侧业务图标路径；传入后显示 profile 缩放后的 64px 基准图标，并通过 `auto_scale` 等比缩放资源 |
| `disabled` | 禁用交互，但仍保留在焦点序列中 |
| `clickable` | `TEXT` 是否可点击；有 `click_func` 时自动视为可点击 |
| `click_func` | `TEXT` 点击/确认回调 |
| `checked` | `SWITCH` / `CHECKBOX` / `RADIO` 初始选中状态 |
| `checked_change_func` | 状态变化回调 |
| `group` | `RADIO` 单选组名 |

文本高度通过 ZeppOS 官方 `getTextLayout()` 计算。默认使用 `text_style.WRAP`，也支持官方 `text_style.ELLIPSIS` / `text_style.NONE`。

### 文本条目

文本条目统一使用 `listWidget.TEXT`。是否显示右箭头、是否响应点击，由 `clickable` / `click_func` 决定。

```js
list.createWidget(listWidget.TEXT, {
  title: '展示文本',
})

list.createWidget(listWidget.TEXT, {
  icon: 'app_icon.png',
  title: '进入详情',
  clickable: true,
  click_func: () => list.push({ url: 'page/detail' }),
})
```

规则：

- 无 `clickable` / `click_func`：进入焦点序列，但不显示焦点框、不响应点击或 SELECT/HOME
- 有 `clickable: true` 或 `click_func`：显示右箭头，显示行焦点框，响应触屏和物理确认键
- 有 `subtitle`：自动使用双行/复合标题布局
- 左侧 `icon` 和右侧箭头都会按当前 profile 尺寸自动等比缩放

### ImageParam

| 参数 | 说明 | 默认 |
|---|---|---|
| `src` | 图片资源路径 | 必填 |
| `w` | 目标图片宽度；不传则读取资源宽度 | 图片原始宽度 |
| `h` | 目标图片高度；不传则读取资源高度 | 图片原始高度 |
| `radius` | 图片、按下遮罩、图片焦点框圆角 | `imageFocusLine` |
| `selectable` | 是否显示图片双描边焦点框；不影响是否响应点击 | `true` |
| `click_func` | 点击/确认回调 | none |
| `disabled` | 禁用交互 | `false` |

图片规则：

- `x/y` 由列表控制，传入会被忽略
- 图片默认居中
- 圆屏基准最大尺寸 `408px`
- 方屏基准最大尺寸 `326px`，即 `390 - 32 * 2`
- 超出最大尺寸时按比例缩放，最终 `w/h` 不会越过当前 profile 的 `imageMax`
- 显式 `radius` 按图片最终缩放比例同步缩放，并同时用于 `IMG.corner_radius`、按下遮罩和双描边焦点框
- 没有 `click_func` 的图片也会进入焦点序列，但不显示焦点框、不响应点击
- 有 `click_func` 且 `selectable: false` 的图片仍可点击，只是不显示图片焦点框

```js
list.createWidget(listWidget.IMAGE, {
  src: 'banner.png',
  radius: 32,
  click_func: () => showToast({ content: '图片' }),
})

list.createWidget(listWidget.IMAGE, {
  src: 'display-only.png',
  selectable: false,
})
```

### CategoryParam

| 参数 | 说明 |
|---|---|
| `text` | 分类文字 |
| `text_i18n` | 分类文字 i18n 文本 |
| `text_style` | 分类文字布局样式，默认 `text_style.WRAP` |

`CATEGORY` 会进入焦点序列，方便按键导航和滚动落焦保持节奏；它不显示焦点框，也不响应点击。

### SPACER

`SPACER` 用于插入一段空白高度。

```js
list.createWidget(listWidget.SPACER, { h: 32 })
list.createWidget(listWidget.SPACER, { height: 32 })
```

规则：

- 不可点击
- 不进入焦点序列
- 不显示焦点框
- 会增加 `list.height`
- 常用于保留状态栏空间、分组间距或测试滚动边界

### 圆屏/方屏适配

ZOList 通过 `@zos/device.getDeviceInfo().screenShape` 自动选择布局 profile，并使用屏幕宽度做整体缩放。

需要权限：

```json
{
  "permissions": ["data:os.device.info"]
}
```

基准 profile：

| 项 | 圆屏 | 方屏 |
|---|---:|---:|
| 设计宽度 | 480 | 390 |
| 设计高度 | 480 | 450 |
| 普通行高 | 104 | 96 |
| 双行行高 | 124 | 122 |
| 分类高度 | 72 | 72 |
| footer 高度 | 188 | 84 |
| 图片最大尺寸 | 408 | 326 |
| 行焦点宽度 | 452 | 361 |
| glow 图片 | 480×24 | 384×19 |

如果设备宽度不是基准宽度，layout、字体、控件、焦点、图片限制会按 `deviceWidth / profileWidth` 缩放。

### 页面跳转与浏览进度

从列表页跳转到其它页面时，建议使用实例方法 `list.push()`，不要直接调用 `@zos/router` 的 `push()`。

```js
list.createWidget(listWidget.TEXT, {
  title: '进入详情页',
  clickable: true,
  click_func: () => list.push({ url: 'page/detail' }),
})
```

`list.push()` 会保存当前 `scrollY` 和 `focusIndex`。如果 ZeppOS 返回时重建原页面，`mount()` 会自动恢复并消费这条记录。

### Modal 与覆盖层

不要在已经创建并 `mount()` 了 `ListPage` 的同一 page 中直接调用 `createModal()`。`ListPage` 会注册物理按键、触屏点击和焦点状态，modal 也是独立按键/覆盖层控件；二者在同一个 page 内同时存在时，容易出现按键事件或残留点击互相抢占。

推荐做法是：列表页只负责 `list.push()` 跳转，弹窗放到一个不创建 `ListPage` 的独立子页面中，并在子页面 `build()` 时创建并显示 modal；关闭、取消或确认后再 `back()` / `exit()`。

### getProperty / setProperty

支持常用非结构属性即时更新：

```js
item.setProperty(listProp.TITLE, '新的标题')
item.setProperty(listProp.CHECKED, false)
list.setProperty(listProp.HEADER_TEXT, '设置')
list.setProperty(listProp.FOCUS_INDEX, 2)

const height = list.getProperty(listProp.HEIGHT)
```

| 值 | 说明 | 作用对象 |
|---|---|---|
| `listProp.HEADER_TEXT` | 页头标题 | list page |
| `listProp.FOCUS_INDEX` | 当前焦点索引 | list page |
| `listProp.SCROLL_Y` | 当前纵向滚动量 | list page |
| `listProp.HEIGHT` | 列表内容总高度，也可读 `list.height` | list page |
| `listProp.TITLE` | 条目主标题 | item |
| `listProp.SUBTITLE` | 条目副标题 | item |
| `listProp.CHECKED` | 条目选中状态 | switch/checkbox/radio item |
| `listProp.CLICK_FUNC` | 点击回调 | item |
| `listProp.CHECKED_CHANGE_FUNC` | 状态变化回调 | switch/checkbox/radio item |
| `listProp.DISABLED` | 禁用交互 | item |

不支持即时重排：插入/删除行、修改行类型、单行和双行互切、可点击文本变不可点击后移除箭头等结构变化。

### 行为规则

- 同一 page 建议只创建一个 `ListPage`；新实例会自动清理旧实例
- `mount()` 后自动注册物理按键
- UP/DOWN 环绕导航
- SELECT/HOME 触发当前焦点项
- SELECT/HOME 长按超过 1 秒取消触发
- 触屏点按显示黑色按下遮罩
- 按键触发不显示按下遮罩
- 触屏按下后只要发生实际移动就取消本次点击，避免滚动时误触发
- 手指滑动或表冠/滚轮滚动开始后隐藏焦点；滚动停止后焦点落到屏幕中心最近项
- display-only `TEXT` / `IMAGE` / `CATEGORY` 进入焦点序列，但不显示焦点框、不触发动作
- `header: false` 不创建 header
- `footer: false` 不创建 footer；这会移除默认底部安全留白，通常只适合已自行追加底部 `SPACER` 或自定义底部区域的页面
- `hideStatusBar` 默认隐藏状态栏
- Touch tap is cancelled on any actual pointer movement to avoid accidental row activation while scrolling

### 资源

至少需要复制这些资源：

```text
assets/default.r/app_icon.png
assets/default.r/arrow.png
assets/default.r/qa.png
assets/default.r/focus_glow_top-1.png
assets/default.r/focus_glow_bot-1.png
assets/default.r/checkbox_on.png
assets/default.r/checkbox_off.png
assets/default.r/radio_on.png
assets/default.r/radio_off.png
assets/default.r/switch_on.png
assets/default.r/switch_off.png
assets/default.r/switch_knob.png
```

如果 `app.json` 里包含方屏平台，例如 `{ "st": "s", "dw": 390 }`，也需要提供对应的 `assets/default.s/`。

### Example / 示例

[example/](example/) 是完整 ZeppOS 3.0 小程序示例，覆盖圆屏、方屏、换行文本、图片、footer、嵌套跳转和状态恢复。

```bash
cd example
zeus build
```

---

## English

### What

**zolist** is an official-style ZeppOS list page control for mini-program pages that need native-looking rows, physical-key focus, touch feedback, crown/wheel scrolling, and round/square screen adaptation. It wraps common list page building blocks into one page-level component:

1. Official-style rows: `TEXT`, `SWITCH`, `CHECKBOX`, `RADIO`, `CATEGORY`, `FOOTER`, `IMAGE`
2. Physical-key focus navigation
3. Touch press feedback
4. Scroll-center focus landing after touch or crown/wheel scrolling
5. Automatic round/square screen adaptation

It is not a built-in ZeppOS widget, but the API intentionally resembles `createWidget(widget.X, Param)`.

### Install

```bash
npm install @zh40s05/zepp-official-list
cp zolist.js your-app/utils/zolist.js
```

Copy runtime assets into `assets/default.r/`; copy them into `assets/default.s/` as well when building for square screens.

### Quick Start

```js
import { showToast } from '@zos/interaction'
import { createListPage, listWidget } from '../utils/zolist'

Page({
  build() {
    const list = createListPage({
      header: { text: 'Settings' },
      footer: { button: true, click_func: () => showToast({ content: 'Help' }) },
    })

    list.createWidget(listWidget.TEXT, {
      title: 'Clickable row',
      clickable: true,
      click_func: () => showToast({ content: 'click' }),
    })

    list.createWidget(listWidget.SWITCH, {
      title: 'Switch row',
      checked: true,
      checked_change_func: (checked) => showToast({ content: checked ? 'on' : 'off' }),
    })

    list.mount()
    this.list = list
  },
})
```

### API

| Export | Description |
|---|---|
| `createListPage(param)` | Create a list page control |
| `listWidget` | Widget type constants |
| `listProp` | Property constants for `getProperty` / `setProperty` |
| `ListPage` | List page class |
| `zolistDispose()` | Manually dispose the current list instance |

### createListPage Options

| Option | Description | Default |
|---|---|---|
| `header` | Header config; pass `false` to disable header | disabled |
| `footer` | Footer config; pass `false` to disable footer | `{}` |
| `hideStatusBar` | Calls `setStatusBarVisible(false)` on creation; pass `false` to keep current status-bar visibility | `true` |
| `touchScrollStep` | Multiplier from touch `scroll_frame_func.yoffset` to internal scroll position; tune touch-scroll focus landing | `1` |
| `crownEnable` | Register `onDigitalCrown` for crown/wheel scrolling | `true` |
| `crownStep` | Multiplier from crown/wheel `degree` to scroll pixels; larger values scroll faster | `2.5` |
| `crownSettleMs` | Delay before rebuilding focus after crown/wheel input settles | `180` |
| `crownVibrate` | Vibrate when crown settling changes the centered item; 20ms strong-short on the scene API, tested short-medium fallback on the legacy API | `true` |
| `debugScroll` | Print `[ZOList.scroll]` diagnostic logs | `false` |

The public API does not expose `x/y/w/h`. The list always starts at `x=0, y=0` and uses the active layout profile size. If you keep the status bar visible, insert a top `SPACER` when needed.

Crown haptics use capability detection instead of a hard-coded OS version. When the API_LEVEL 3.6 scene API is available, ZOList uses `getType()` and a 20ms `STRONG_SHORT` action. If that API is missing or fails, it falls back to the API_LEVEL 2.0 `setMode(VIBRATOR_SCENE_DURATION)` → `start()` sequence. Shimmer true-device testing found that this legacy mode maps to a short-medium pulse on affected old firmware, so the fallback is an intentional downgrade. The exact firmware version that fixed the legacy mode mapping is unknown.

Keep the default footer (`footer: {}`) even when you do not need a visible help button. The footer also provides bottom safe spacing so the last screen of content is not clipped by the system bottom area. Use `footer: false` only when you add equivalent bottom spacing yourself or fully own the page bottom.

### Modal and overlays

Do not call `createModal()` directly from a page that already created and mounted a `ListPage`. `ListPage` registers physical keys, touch handling, and focus state, while modal is its own key-consuming overlay. Keeping both active in the same page can make key events or residual clicks compete.

Recommended pattern: keep the list page responsible only for `list.push()` navigation, put the modal in a separate child page that does not create a `ListPage`, and create/show the modal in that child page's `build()`. Close, cancel, or confirm should then call `back()` / `exit()` as appropriate.

Tune scroll multipliers in `createListPage()`:

```js
const list = createListPage({
  touchScrollStep: 1,  // touch drag multiplier, default 1
  crownStep: 2.5,     // crown/wheel multiplier, default 2.5
  crownVibrate: true, // strong-short on new systems, tested legacy downgrade on old systems
})
```

### Widgets

| Widget | Description |
|---|---|
| `TEXT` | Text row, optionally clickable, with optional left icon and arrow |
| `SWITCH` | Switch row |
| `CHECKBOX` | Checkbox row |
| `RADIO` | Radio row |
| `CATEGORY` | Section label |
| `IMAGE` | Centered image row |
| `FOOTER` | Manual footer |
| `SPACER` | Manual vertical blank space |

Display-only `TEXT`, `IMAGE`, and `CATEGORY` entries are still part of the focus sequence for key navigation and scroll-center landing, but they do not show a focus frame and do not respond to click/SELECT.

### Screen Adaptation

ZOList reads `getDeviceInfo().screenShape` and selects a round or square layout profile. It then scales layout, font, focus, footer controls, and image limits by screen width.

Requires `"data:os.device.info"` in `app.json` on runtimes that enforce device info permissions.

Baseline values:

| Item | Round | Square |
|---|---:|---:|
| Width | 480 | 390 |
| Height | 480 | 450 |
| Single row | 104 | 96 |
| Multi row | 124 | 122 |
| Footer | 188 | 84 |
| Image max | 408 | 326 |
| Focus width | 452 | 361 |

### Images

Images are centered and capped by the active profile: round baseline max `408`, square baseline max `326`. Explicit `radius` is interpreted in the source/target image coordinate system and scales with the final image fit; the same result is used for the `IMG.corner_radius`, press mask, and image focus frame.

`selectable: false` suppresses the image focus frame only. If `click_func` exists, the image still responds to touch and SELECT/HOME.

### Example

[example/](example/) is a complete ZeppOS 3.0 sample app.

```bash
cd example
zeus build
```
