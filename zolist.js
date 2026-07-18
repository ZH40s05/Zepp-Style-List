/**
 * zolist.js — ZeppOS Official-style List Page Library
 * ZeppOS 官方风格列表页面控件
 *
 * 设计目标: 用接近 createWidget(widget.X, Param) 的方式创建官方风格列表页。
 */
import { createWidget, widget, align, text_style, prop, event, getTextLayout, getImageInfo, setStatusBarVisible } from '@zos/ui'
import {
  onKey, offKey, onDigitalCrown, offDigitalCrown, KEY_UP, KEY_DOWN, KEY_SELECT, KEY_HOME, KEY_BACK,
  KEY_EVENT_CLICK, KEY_EVENT_PRESS, KEY_EVENT_RELEASE,
} from '@zos/interaction'
import { Vibrator, VIBRATOR_SCENE_DURATION } from '@zos/sensor'
import { push as routerPush } from '@zos/router'
import { getDeviceInfo, SCREEN_SHAPE_SQUARE } from '@zos/device'

export const listWidget = {
  TEXT: 'TEXT',
  SWITCH: 'SWITCH',
  CHECKBOX: 'CHECKBOX',
  RADIO: 'RADIO',
  IMAGE: 'IMAGE',
  CATEGORY: 'CATEGORY',
  FOOTER: 'FOOTER',
  SPACER: 'SPACER',
}

export const listProp = {
  HEADER_TEXT: 'HEADER_TEXT',
  FOCUS_INDEX: 'FOCUS_INDEX',
  SCROLL_Y: 'SCROLL_Y',
  HEIGHT: 'HEIGHT',
  TITLE: 'TITLE',
  SUBTITLE: 'SUBTITLE',
  CHECKED: 'CHECKED',
  CLICK_FUNC: 'CLICK_FUNC',
  CHECKED_CHANGE_FUNC: 'CHECKED_CHANGE_FUNC',
  DISABLED: 'DISABLED',
}

const COLOR = {
  bg: 0x000000,
  title: 0xffffff,
  subtitle: 0xb2b2b2,
  category: 0xb2b2b2,
  footerBtnBg: 0x333333,
  footerBtnOuter: 0x101010,
  footerBtnInner: 0x9b9b9b,
  pressMask: 0x000000,
  focusBg: 0xffffff,
}

const BASE_FONT = {
  headerSize: 40, headerLine: 50,
  titleSize: 36, titleLine: 46,
  subSize: 32, subLine: 40,
  catSize: 32, catLine: 40,
}

const ROUND_LAYOUT = {
  screenW: 480,
  screenH: 480,
  padL: 36,
  padR: 34,
  headerPadX: 58,
  headerSubPadX: 36,
  headerTop: 40,
  headerTitleGap: 7,
  headerSubH: 183,
  headerSubBottomPad: 6,
  iconSize: 64,
  iconGap: 16,
  rowGap: 8,
  rowSingle: 104,
  rowMulti: 124,
  headerH: 138,
  footerH: 188,
  catH: 72,
  arrowW: 24,
  arrowH: 42,
  switchW: 100,
  switchH: 68,
  switchKnobR: 20,
  ctrlSize: 64,
  tapMove: 0,
  pressAlpha: 71,
  focusBgW: 452,
  focusBgRadius: 37,
  focusBgAlpha: 48,
  focusGlowW: 480,
  focusGlowH: 24,
  focusGlowAlpha: 247,
  imageMax: 408,
  imagePadY: 24,
  imageFocusLine: 4,
  footerBtnY: 65,
}

const SQUARE_LAYOUT = {
  ...ROUND_LAYOUT,
  screenW: 390,
  screenH: 450,
  padL: 32,
  padR: 30,
  rowSingle: 96,
  rowMulti: 122,
  footerH: 84,
  focusBgW: 361,
  focusGlowW: 384,
  focusGlowH: 19,
  imageMax: 326,
  footerBtnY: 12,
}

const SCALE_LAYOUT_KEYS = [
  'padL', 'padR', 'headerPadX', 'headerSubPadX', 'headerTop', 'headerTitleGap',
  'headerSubH', 'headerSubBottomPad', 'iconSize', 'iconGap', 'rowGap', 'rowSingle', 'rowMulti', 'headerH', 'footerH',
  'catH', 'arrowW', 'arrowH', 'switchW', 'switchH', 'switchKnobR', 'ctrlSize',
  'focusBgW', 'focusBgRadius', 'focusGlowW', 'focusGlowH',
  'imageMax', 'imagePadY', 'imageFocusLine', 'footerBtnY',
]

const ASSET = {
  appIcon: 'app_icon.png',
  arrow: 'arrow.png',
  qa: 'qa.png',
  focusGlowTop: 'focus_glow_top-1.png',
  focusGlowBot: 'focus_glow_bot-1.png',
}

const HOLD_MS = 1000

let currentListPage = null
const LIST_STATE_KEY = '__zolistPageState'

function scaledValue(v, scale) {
  return Math.max(1, Math.round(v * scale))
}

function scaleLayout(base, info) {
  const width = info && info.width ? info.width : base.screenW
  const height = info && info.height ? info.height : scaledValue(base.screenH, width / base.screenW)
  const scale = width / base.screenW
  const layout = { ...base, screenW: width, screenH: height, scale }
  SCALE_LAYOUT_KEYS.forEach((k) => { layout[k] = scaledValue(base[k], scale) })
  layout.font = {}
  Object.keys(BASE_FONT).forEach((k) => { layout.font[k] = scaledValue(BASE_FONT[k], scale) })
  return layout
}

function getLayout() {
  const info = getDeviceInfo ? getDeviceInfo() : {}
  const base = info && info.screenShape === SCREEN_SHAPE_SQUARE ? SQUARE_LAYOUT : ROUND_LAYOUT
  return scaleLayout(base, info)
}

function getStateStore() {
  const app = getApp && getApp()
  if (!app._options.globalData) app._options.globalData = {}
  if (!app._options.globalData[LIST_STATE_KEY]) app._options.globalData[LIST_STATE_KEY] = {}
  return app._options.globalData[LIST_STATE_KEY]
}

function textParam(text, textI18n) {
  return textI18n ? { text_i18n: textI18n } : { text }
}

function resolveTextStyle(style) {
  return style === undefined || style === null ? text_style.WRAP : style
}

function isWrapTextStyle(style) {
  return resolveTextStyle(style) === text_style.WRAP
}

function textToMeasure(text, textI18n) {
  if (text) return text
  if (!textI18n) return ''
  let longest = ''
  Object.keys(textI18n).forEach((k) => {
    const v = textI18n[k] || ''
    if (v.length > longest.length) longest = v
  })
  return longest
}

function measureTextHeight(text, textI18n, style, textSize, textWidth, fallbackH) {
  if (!isWrapTextStyle(style)) return fallbackH
  const layout = getTextLayout(textToMeasure(text, textI18n), {
    text_size: textSize,
    text_width: textWidth,
    wrapped: 1,
  })
  return layout && layout.height ? layout.height : fallbackH
}

function createText(parent, param) {
  return parent.createWidget(widget.TEXT, {
    ...param,
    text_style: resolveTextStyle(param.text_style),
  })
}

function glowParam(layout, y, src) {
  return {
    x: (layout.screenW - layout.focusGlowW) / 2,
    y,
    w: layout.focusGlowW,
    h: layout.focusGlowH,
    src,
    alpha: layout.focusGlowAlpha,
    auto_scale: true,
    auto_scale_obj_fit: false,
  }
}

function resolveImageSize(o, layout) {
  const info = o.src ? (getImageInfo(o.src) || {}) : {}
  let w = o.w || info.width || layout.imageMax
  let h = o.h || info.height || layout.imageMax
  const targetW = w
  const targetH = h
  const scale = Math.min(1, layout.imageMax / w, layout.imageMax / h)
  if (scale < 1) {
    w = Math.round(w * scale)
    h = Math.round(h * scale)
  }
  const renderScale = Math.min(w / targetW, h / targetH) || 1
  return { w, h, renderScale }
}

function tappable(w, { onTap, onPressIn, onPressOut, tapMove = ROUND_LAYOUT.tapMove } = {}) {
  let down = false
  let cancelled = false
  let sx = 0
  let sy = 0
  const T2 = tapMove * tapMove

  function cancel() {
    if (!down) return
    down = false
    cancelled = true
    onPressOut && onPressOut()
  }

  w.addEventListener(event.CLICK_DOWN, (info) => {
    down = true
    cancelled = false
    sx = info.x
    sy = info.y
    onPressIn && onPressIn()
  })

  w.addEventListener(event.MOVE, (info) => {
    if (!down) return
    const dx = info.x - sx
    const dy = info.y - sy
    if (dx * dx + dy * dy > T2) cancel()
  })

  w.addEventListener(event.MOVE_OUT, () => cancel())

  w.addEventListener(event.CLICK_UP, () => {
    if (!down) return
    down = false
    onPressOut && onPressOut()
    if (!cancelled) onTap && onTap()
  })

  return { cancel }
}

function createSwitch(parent, o, layout) {
  let checked = !!o.checked
  const sw = parent.createWidget(widget.SLIDE_SWITCH, {
    x: o.x,
    y: o.y,
    checked,
  })

  const aw = sw.getProperty(prop.W)
  const ah = sw.getProperty(prop.H)
  if (aw && ah) {
    sw.setProperty(prop.MORE, {
      x: o.x + layout.switchW - aw,
      y: o.y + (layout.switchH - ah) / 2,
      checked,
    })
  }

  const set = (v) => { checked = !!v; sw.setProperty(prop.CHECKED, checked) }
  return {
    widget: sw,
    isChecked: () => checked,
    setChecked: set,
    toggle: () => { set(!checked); o.onChange && o.onChange(checked) },
  }
}

function createCheckbox(parent, o, layout) {
  let checked = !!o.checked
  const ctrl = layout.ctrlSize
  const x = o.cx - ctrl / 2, y = o.cy - ctrl / 2
  const group = parent.createWidget(widget.CHECKBOX_GROUP, {
    x, y, w: ctrl, h: ctrl,
    select_src: 'checkbox_on.png',
    unselect_src: 'checkbox_off.png',
  })
  const btn = group.createWidget(widget.STATE_BUTTON, { x: 0, y: 0, w: ctrl, h: ctrl })
  group.setProperty(prop.INIT, btn)
  if (!checked) group.setProperty(prop.UNCHECKED, btn)
  const set = (v) => { checked = !!v; group.setProperty(checked ? prop.CHECKED : prop.UNCHECKED, btn) }
  return {
    widget: group,
    isChecked: () => checked,
    setChecked: set,
    toggle: () => { set(!checked); o.onChange && o.onChange(checked) },
  }
}

class RadioGroup {
  constructor(parent, layout) {
    this.layout = layout
    this.items = []
    this.selectedIdx = 0
    this.group = parent.createWidget(widget.RADIO_GROUP, {
      x: 0, y: 0, w: layout.screenW, h: layout.screenH,
      select_src: 'radio_on.png',
      unselect_src: 'radio_off.png',
    })
  }

  add(cx, cy, checked, onChange) {
    const ctrl = this.layout.ctrlSize
    const btn = this.group.createWidget(widget.STATE_BUTTON, {
      x: cx - ctrl / 2, y: cy - ctrl / 2, w: ctrl, h: ctrl,
    })
    if (checked) this.selectedIdx = this.items.length
    const idx = this.items.length
    const set = () => this.selectIndex(idx)
    const handle = {
      _idx: idx,
      widget: this.group,
      isChecked: () => this.selectedIdx === idx,
      setChecked: (v) => { if (v) set() },
      toggle: set,
    }
    this.items.push({ btn, onChange, handle })
    return handle
  }

  selectIndex(idx) {
    const it = this.items[idx]
    if (!it) return
    if (idx !== this.selectedIdx) {
      this.selectedIdx = idx
      this.group.setProperty(prop.CHECKED, it.btn)
    }
    it.onChange && it.onChange(idx)
  }

  commit() {
    if (this.items.length) this.group.setProperty(prop.INIT, this.items[this.selectedIdx].btn)
  }
}

class ListItem {
  constructor(page, entry) {
    this.page = page
    this.entry = entry
  }

  get title() { return this.getProperty(listProp.TITLE) }
  set title(v) { this.setProperty(listProp.TITLE, v) }
  get subtitle() { return this.getProperty(listProp.SUBTITLE) }
  set subtitle(v) { this.setProperty(listProp.SUBTITLE, v) }
  get checked() { return this.getProperty(listProp.CHECKED) }
  set checked(v) { this.setProperty(listProp.CHECKED, v) }
  get disabled() { return this.getProperty(listProp.DISABLED) }
  set disabled(v) { this.setProperty(listProp.DISABLED, v) }

  setProperty(p, v) {
    const e = this.entry
    if (p === listProp.TITLE) {
      e.title = v
      if (e.titleWidget) e.titleWidget.setProperty(prop.TEXT, v)
      return this
    }
    if (p === listProp.SUBTITLE) {
      e.subtitle = v
      if (e.subtitleWidget) e.subtitleWidget.setProperty(prop.TEXT, v || '')
      return this
    }
    if (p === listProp.CHECKED) {
      if (e.controlHandle && e.controlHandle.setChecked) e.controlHandle.setChecked(v)
      return this
    }
    if (p === listProp.CLICK_FUNC) {
      e.action = typeof v === 'function' ? v : null
      return this
    }
    if (p === listProp.CHECKED_CHANGE_FUNC) {
      e.onChange = typeof v === 'function' ? v : null
      return this
    }
    if (p === listProp.DISABLED) {
      e.disabled = !!v
      return this
    }
    return this
  }

  getProperty(p) {
    const e = this.entry
    if (p === listProp.TITLE) return e.title
    if (p === listProp.SUBTITLE) return e.subtitle
    if (p === listProp.CHECKED) return e.controlHandle && e.controlHandle.isChecked ? e.controlHandle.isChecked() : false
    if (p === listProp.CLICK_FUNC) return e.action
    if (p === listProp.CHECKED_CHANGE_FUNC) return e.onChange
    if (p === listProp.DISABLED) return !!e.disabled
    return undefined
  }
}

export class ListPage {
  constructor(param = {}) {
    if (currentListPage && !currentListPage._disposed) currentListPage.dispose()
    currentListPage = this

    if (param.hideStatusBar !== false) setStatusBarVisible(false)

    this.x = 0
    this.y = 0
    this.layout = getLayout()
    this.w = this.layout.screenW
    this.h = this.layout.screenH
    this.keyEnable = true
    this._keepStateOnDispose = false
    this.footerParam = param.footer === undefined ? {} : param.footer
    this._footerCreated = false
    this.cursor = 0
    this.radioGroups = {}
    this._rows = []
    this._selectables = []
    this._items = []
    this._activeTap = null
    this.focusables = []
    this.focusIdx = -1
    this._pressing = false
    this._cancelled = false
    this._pressTimer = null
    this._clickFallback = true
    this._keyCb = null
    this._crownCb = null
    this._crownTimer = null
    this.crownEnable = param.crownEnable !== false
    this.crownStep = param.crownStep === undefined ? 2.5 : param.crownStep
    this.crownSettleMs = param.crownSettleMs === undefined ? 180 : param.crownSettleMs
    this.crownVibrate = param.crownVibrate !== false
    this._vibrator = null
    this.touchScrollStep = param.touchScrollStep === undefined ? 1 : param.touchScrollStep
    this._scrollAnim = null
    this._scrollPos = 0
    this._dragging = false
    this._keyScrolling = false
    this._mounted = false
    this._disposed = false
    this.debugScroll = !!param.debugScroll
    this._scrollDebugFrame = 0

    this.vc = createWidget(widget.VIEW_CONTAINER, {
      x: this.x, y: this.y, w: this.w, h: this.h, scroll_enable: 1,
      scroll_frame_func: (frame) => {
        if (this._keyScrolling) { this._debugScroll('frame_skip_key', frame); return }
        const frameScrollY = this._syncScrollFromFrame(frame)
        this._scrollDebugFrame++
        if (this._scrollDebugFrame <= 5 || this._scrollDebugFrame % 10 === 0) {
          this._debugScroll('frame', frame, 'frame_count=' + this._scrollDebugFrame + ' frame_scroll_y=' + this._debugValue(frameScrollY))
        }
        if (this._activeTap) { this._activeTap.cancel(); this._activeTap = null }
        if (!this._dragging) {
          this._dragging = true
          this._debugScroll('drag_start', frame)
          this._hideFocus()
        }
      },
      scroll_complete_func: (frame) => {
        if (this._keyScrolling) { this._debugScroll('complete_skip_key', frame); return }
        const frameScrollY = this._syncScrollFromFrame(frame)
        this._debugScroll('complete_enter', frame, 'frame_scroll_y=' + this._debugValue(frameScrollY))
        if (!this._dragging) { this._debugScroll('complete_skip_not_dragging', frame); return }
        this._dragging = false
        const idx = this._nearestToCenter()
        this._debugScroll('complete_nearest', frame, 'idx=' + idx)
        if (idx >= 0) this._setFocus(idx, false)
      },
    })

    if (param.header !== false && param.header) this._createHeader(param.header)
  }

  get headerText() { return this.getProperty(listProp.HEADER_TEXT) }
  set headerText(v) { this.setProperty(listProp.HEADER_TEXT, v) }
  get focusIndex() { return this.getProperty(listProp.FOCUS_INDEX) }
  set focusIndex(v) { this.setProperty(listProp.FOCUS_INDEX, v) }
  get scrollY() { return this.getProperty(listProp.SCROLL_Y) }
  set scrollY(v) { this.setProperty(listProp.SCROLL_Y, v) }
  get height() { return this.getProperty(listProp.HEIGHT) }

  createWidget(type, param = {}) {
    if (type === listWidget.CATEGORY) { this._createCategory(param); return this }
    if (type === listWidget.FOOTER) { this._createFooter(param); return this }
    if (type === listWidget.SPACER) { this._createSpacer(param.h || param.height || 0); return this }
    if (type === listWidget.IMAGE) return this._createImage(param)
    return this._createRow(type, param)
  }

  mount() {
    if (this._mounted) return this
    if (this.footerParam !== false && !this._footerCreated) this._createFooter(this.footerParam || {})
    this._mounted = true
    this._commitRadioGroups()
    this._createFocusLayers()
    this._createMasks()
    if (this.keyEnable) this._enableKeys()
    this._restoreState()
    return this
  }

  push(option) {
    this._saveState()
    this._keepStateOnDispose = true
    this._release()
    routerPush(option)
  }

  dispose() {
    this._release()
    if (!this._keepStateOnDispose) this._clearState()
    this._disposed = true
    if (currentListPage === this) currentListPage = null
  }

  _release() {
    if (this._keyCb) { offKey(); this._keyCb = null }
    if (this._crownCb) { try { offDigitalCrown() } catch (e) {}; this._crownCb = null }
    if (this._pressTimer) { clearTimeout(this._pressTimer); this._pressTimer = null }
    if (this._crownTimer) { clearTimeout(this._crownTimer); this._crownTimer = null }
    if (this._scrollAnim) { clearInterval(this._scrollAnim); this._scrollAnim = null }
  }

  setProperty(p, v) {
    if (p === listProp.HEADER_TEXT) {
      this._headerText = v
      if (this.headerWidget) this.headerWidget.setProperty(prop.TEXT, v)
      return this
    }
    if (p === listProp.FOCUS_INDEX) {
      this._setFocus(v)
      return this
    }
    if (p === listProp.SCROLL_Y) {
      const maxScroll = Math.max(0, this.cursor - this.h)
      this._setScrollY(Math.max(0, Math.min(v || 0, maxScroll)))
      return this
    }
    return this
  }

  getProperty(p) {
    if (p === listProp.HEADER_TEXT) return this._headerText
    if (p === listProp.FOCUS_INDEX) return this.focusIdx
    if (p === listProp.SCROLL_Y) return this._getScrollY()
    if (p === listProp.HEIGHT) return this.cursor
    return undefined
  }

  _getStateKey() {
    return this.stateKey || this._headerText || 'default'
  }

  _saveState() {
    const store = getStateStore()
    store[this._getStateKey()] = {
      scrollY: this.getProperty(listProp.SCROLL_Y),
      focusIndex: this.focusIdx,
    }
  }

  _restoreState() {
    const store = getStateStore()
    const key = this._getStateKey()
    const state = store[key]
    if (!state) return
    delete store[key]
    if (typeof state.focusIndex === 'number' && state.focusIndex >= 0 && state.focusIndex < this.focusables.length) {
      this._setFocus(state.focusIndex, false)
    }
    if (typeof state.scrollY === 'number') {
      this.setProperty(listProp.SCROLL_Y, state.scrollY)
    }
  }

  _clearState() {
    const store = getStateStore()
    delete store[this._getStateKey()]
  }

  _createHeader(o) {
    const text = typeof o === 'string' ? o : (o.text || '')
    const textI18n = typeof o === 'string' ? null : o.text_i18n
    const subtitle = typeof o === 'string' ? '' : (o.subtitle || '')
    const subtitleI18n = typeof o === 'string' ? null : o.subtitle_i18n
    const hasSubtitle = subtitle !== '' || !!subtitleI18n
    const titleStyle = typeof o === 'string' ? undefined : (o.title_text_style !== undefined ? o.title_text_style : o.text_style)
    const subtitleStyle = typeof o === 'string' ? undefined : (o.subtitle_text_style !== undefined ? o.subtitle_text_style : o.text_style)
    const titleResolvedStyle = resolveTextStyle(titleStyle)
    const subtitleResolvedStyle = resolveTextStyle(subtitleStyle)
    const textW = this.layout.screenW - (hasSubtitle ? this.layout.headerSubPadX : this.layout.headerPadX) * 2
    const titleH = measureTextHeight(text, textI18n, titleResolvedStyle, this.layout.font.headerSize, textW, this.layout.font.headerLine)
    const subtitleH = hasSubtitle ? measureTextHeight(subtitle, subtitleI18n, subtitleResolvedStyle, this.layout.font.subSize, textW, this.layout.font.subLine) : 0
    const bottomPad = hasSubtitle ? this.layout.headerSubBottomPad : (this.layout.headerH - this.layout.headerTop - this.layout.font.headerLine)
    const blockH = hasSubtitle ? titleH + this.layout.headerTitleGap + subtitleH + bottomPad : titleH
    const headerH = hasSubtitle ? Math.max(this.layout.headerSubH, blockH) : Math.max(this.layout.headerH, this.layout.headerTop + titleH + bottomPad)
    const startY = hasSubtitle ? this.cursor + Math.max(0, (headerH - blockH) / 2) : this.cursor + this.layout.headerTop

    this._headerText = text
    this.headerWidget = createText(this.vc, {
      x: (this.layout.screenW - textW) / 2, y: startY, w: textW, h: isWrapTextStyle(titleResolvedStyle) ? titleH : this.layout.font.headerLine,
      color: COLOR.title, text_size: this.layout.font.headerSize,
      align_h: align.CENTER_H, align_v: align.CENTER_V,
      text_style: titleResolvedStyle, ...textParam(text, textI18n),
    })
    if (hasSubtitle) {
      this.headerSubtitleWidget = createText(this.vc, {
        x: (this.layout.screenW - textW) / 2, y: startY + titleH + this.layout.headerTitleGap, w: textW, h: isWrapTextStyle(subtitleResolvedStyle) ? subtitleH : this.layout.font.subLine,
        color: COLOR.subtitle, text_size: this.layout.font.subSize,
        align_h: align.CENTER_H, align_v: align.CENTER_V,
        text_style: subtitleResolvedStyle, ...textParam(subtitle, subtitleI18n),
      })
    }
    this.cursor += headerH
  }

  _createCategory(o) {
    const text = typeof o === 'string' ? o : (o.text || o.title || '')
    const textI18n = typeof o === 'string' ? null : o.text_i18n
    const style = typeof o === 'string' ? undefined : o.text_style
    const resolvedStyle = resolveTextStyle(style)
    const top = this.cursor
    const textW = this.layout.screenW - this.layout.padL * 2
    const textH = measureTextHeight(text, textI18n, resolvedStyle, this.layout.font.catSize, textW, this.layout.font.catLine)
    const rowH = Math.max(this.layout.catH, textH + (this.layout.catH - this.layout.font.catLine))
    createText(this.vc, {
      x: this.layout.padL, y: isWrapTextStyle(resolvedStyle) ? top + (rowH - textH) / 2 : top, w: textW, h: isWrapTextStyle(resolvedStyle) ? textH : rowH,
      color: COLOR.category, text_size: this.layout.font.catSize,
      align_h: align.CENTER_H, align_v: align.CENTER_V,
      text_style: resolvedStyle, ...textParam(text, textI18n),
    })
    this._selectables.push({
      top,
      height: rowH,
      action: null,
      focusTop: top,
      focusH: rowH,
      setFocus: () => {},
    })
    this.cursor += rowH + this.layout.rowGap
  }

  _createRow(type, o) {
    const hasSubtitle = o.subtitle !== undefined && o.subtitle !== null && o.subtitle !== ''
    const top = this.cursor
    const clickable = type === listWidget.TEXT && (o.clickable || o.click_func)
    const icon = o.icon
    const titleStyle = o.title_text_style !== undefined ? o.title_text_style : o.text_style
    const subtitleStyle = o.subtitle_text_style !== undefined ? o.subtitle_text_style : o.text_style
    const titleResolvedStyle = resolveTextStyle(titleStyle)
    const subtitleResolvedStyle = resolveTextStyle(subtitleStyle)

    let textX = this.layout.padL
    if (icon) textX = this.layout.padL + this.layout.iconSize + this.layout.iconGap

    let textRight = this.layout.screenW - this.layout.padR
    let ctrlX = 0
    if (type === listWidget.TEXT && clickable) {
      textRight = (this.layout.screenW - this.layout.padR - this.layout.arrowW) - this.layout.iconGap
    } else if (type === listWidget.SWITCH) {
      ctrlX = this.layout.screenW - this.layout.padR - this.layout.switchW
      textRight = ctrlX - this.layout.iconGap
    } else if (type === listWidget.CHECKBOX || type === listWidget.RADIO) {
      ctrlX = this.layout.screenW - this.layout.padR - this.layout.ctrlSize
      textRight = ctrlX - this.layout.iconGap
    }
    const ctrlCx = ctrlX + this.layout.ctrlSize / 2
    const textW = Math.max(0, textRight - textX)

    const entry = {
      type, top, height: 0, title: o.title || '', subtitle: o.subtitle || '', disabled: !!o.disabled,
      onChange: o.checked_change_func || null,
      action: clickable ? (o.click_func || (() => {})) : (o.click_func || null),
    }

    let rowH
    if (hasSubtitle) {
      const titleH = measureTextHeight(entry.title, o.title_i18n, titleResolvedStyle, this.layout.font.titleSize, textW, this.layout.font.titleLine)
      const subtitleH = measureTextHeight(entry.subtitle, o.subtitle_i18n, subtitleResolvedStyle, this.layout.font.subSize, textW, this.layout.font.subLine)
      const blockH = titleH + subtitleH
      rowH = Math.max(this.layout.rowMulti, blockH + this.layout.rowMulti - this.layout.font.titleLine - this.layout.font.subLine)
      const sy = top + (rowH - blockH) / 2
      entry.titleWidget = createText(this.vc, {
        x: textX, y: sy, w: textW, h: titleH,
        color: COLOR.title, text_size: this.layout.font.titleSize,
        align_h: align.LEFT, align_v: align.CENTER_V,
        text_style: titleResolvedStyle, ...textParam(entry.title, o.title_i18n),
      })
      entry.subtitleWidget = createText(this.vc, {
        x: textX, y: sy + titleH, w: textW, h: subtitleH,
        color: COLOR.subtitle, text_size: this.layout.font.subSize,
        align_h: align.LEFT, align_v: align.CENTER_V,
        text_style: subtitleResolvedStyle, ...textParam(entry.subtitle, o.subtitle_i18n),
      })
    } else {
      const titleH = measureTextHeight(entry.title, o.title_i18n, titleResolvedStyle, this.layout.font.titleSize, textW, this.layout.font.titleLine)
      rowH = Math.max(this.layout.rowSingle, titleH + this.layout.rowSingle - this.layout.font.titleLine)
      entry.titleWidget = createText(this.vc, {
        x: textX, y: isWrapTextStyle(titleResolvedStyle) ? top + (rowH - titleH) / 2 : top, w: textW, h: isWrapTextStyle(titleResolvedStyle) ? titleH : rowH,
        color: COLOR.title, text_size: this.layout.font.titleSize,
        align_h: align.LEFT, align_v: align.CENTER_V,
        text_style: titleResolvedStyle, ...textParam(entry.title, o.title_i18n),
      })
    }

    entry.height = rowH
    const midY = top + rowH / 2

    if (icon) {
      this.vc.createWidget(widget.IMG, {
        x: this.layout.padL, y: midY - this.layout.iconSize / 2, w: this.layout.iconSize, h: this.layout.iconSize,
        src: icon,
        auto_scale: true,
        auto_scale_obj_fit: false,
      })
    }

    if (type === listWidget.TEXT && clickable) {
      this.vc.createWidget(widget.IMG, {
        x: this.layout.screenW - this.layout.padR - this.layout.arrowW, y: midY - this.layout.arrowH / 2,
        w: this.layout.arrowW, h: this.layout.arrowH, src: ASSET.arrow,
        auto_scale: true,
        auto_scale_obj_fit: false,
      })
    } else if (type === listWidget.SWITCH) {
      entry.controlHandle = createSwitch(this.vc, {
        x: ctrlX, y: midY - this.layout.switchH / 2, checked: o.checked,
        onChange: (checked) => entry.onChange && entry.onChange(checked),
      }, this.layout)
      entry.action = () => entry.controlHandle.toggle()
    } else if (type === listWidget.CHECKBOX) {
      entry.controlHandle = createCheckbox(this.vc, {
        cx: ctrlCx, cy: midY, checked: o.checked,
        onChange: (checked) => entry.onChange && entry.onChange(checked),
      }, this.layout)
      entry.action = () => entry.controlHandle.toggle()
    } else if (type === listWidget.RADIO) {
      const groupName = o.group || 'default'
      if (!this.radioGroups[groupName]) this.radioGroups[groupName] = new RadioGroup(this.vc, this.layout)
      entry.controlHandle = this.radioGroups[groupName].add(ctrlCx, midY, o.checked, () => entry.onChange && entry.onChange())
      entry.action = () => entry.controlHandle.toggle()
    }

    if (type === listWidget.TEXT && !clickable) entry.action = null
    if (entry.action) this._rows.push(entry)
    this._selectables.push(entry)

    const item = new ListItem(this, entry)
    entry.item = item
    this._items.push(item)
    this.cursor += rowH + this.layout.rowGap
    return item
  }

  _createImage(o) {
    const size = resolveImageSize(o, this.layout)
    const top = this.cursor
    const rowH = size.h + this.layout.imagePadY * 2
    const x = (this.layout.screenW - size.w) / 2
    const y = top + this.layout.imagePadY
    const { radius, selectable, click_func, disabled, ...imgParam } = o
    const imageRadius = radius === undefined ? this.layout.imageFocusLine : scaledValue(radius, size.renderScale)
    this.vc.createWidget(widget.IMG, {
      ...imgParam,
      x, y, w: size.w, h: size.h,
      radius: imageRadius,
      corner_radius: imageRadius,
      auto_scale: true,
      auto_scale_obj_fit: false,
    })

    const entry = {
      top, _x: x, _y: y, height: rowH, width: size.w, imageH: size.h,
      radius: imageRadius,
      disabled: !!disabled,
      action: click_func || null,
      kind: 'image',
      selectable: selectable !== false,
      focusTop: y,
      focusH: size.h,
    }
    if (entry.action) this._rows.push(entry)
    this._selectables.push(entry)
    const item = new ListItem(this, entry)
    entry.item = item
    this._items.push(item)
    this.cursor += rowH + this.layout.rowGap
    return item
  }

  _createFooter(o = {}) {
    this._footerCreated = true
    const top = this.cursor
    this.vc.createWidget(widget.FILL_RECT, { x: 0, y: top, w: this.layout.screenW, h: this.layout.footerH, color: COLOR.bg })
    if (o.button) {
      const btn = scaledValue(60, this.layout.scale)
      const btnInner = scaledValue(56, this.layout.scale)
      const btnInset = scaledValue(2, this.layout.scale)
      const btnRadius = scaledValue(28, this.layout.scale)
      const iconOffset = scaledValue(10, this.layout.scale)
      const iconSize = scaledValue(40, this.layout.scale)
      const outerLine = scaledValue(7, this.layout.scale)
      const innerLine = scaledValue(4, this.layout.scale)
      const cx = this.layout.screenW / 2
      const bx = cx - btn / 2, by = top + this.layout.footerBtnY
      this.vc.createWidget(widget.FILL_RECT, {
        x: bx + btnInset, y: by + btnInset, w: btnInner, h: btnInner, radius: btnRadius, color: COLOR.footerBtnBg,
      })
      const outer = this.vc.createWidget(widget.STROKE_RECT, {
        x: bx + btnInset, y: by + btnInset, w: btnInner, h: btnInner, radius: btnRadius, line_width: outerLine, color: COLOR.footerBtnOuter,
      })
      const inner = this.vc.createWidget(widget.STROKE_RECT, {
        x: bx + btnInset, y: by + btnInset, w: btnInner, h: btnInner, radius: btnRadius, line_width: innerLine, color: COLOR.footerBtnInner,
      })
      outer.setProperty(prop.VISIBLE, false)
      inner.setProperty(prop.VISIBLE, false)
      this.vc.createWidget(widget.IMG, { x: bx + iconOffset, y: by + iconOffset, w: iconSize, h: iconSize, src: ASSET.qa, auto_scale: true, auto_scale_obj_fit: false })
      this._rows.push({
        top: bx, _y: by, height: btn, width: btn, round: btn / 2, kind: 'footerBtn',
        action: o.click_func || (() => {}),
        setFocus: (on) => { outer.setProperty(prop.VISIBLE, on); inner.setProperty(prop.VISIBLE, on) },
        focusTop: by, focusH: btn,
      })
      this._selectables.push(this._rows[this._rows.length - 1])
    }
    this.cursor += this.layout.footerH
  }

  _createSpacer(h) {
    this.vc.createWidget(widget.FILL_RECT, { x: 0, y: this.cursor, w: this.layout.screenW, h, color: COLOR.bg })
    this.cursor += h
  }

  _commitRadioGroups() {
    Object.keys(this.radioGroups).forEach((k) => this.radioGroups[k].commit())
  }

  _createFocusLayers() {
    this.focusBg = this.vc.createWidget(widget.FILL_RECT, {
      x: (this.layout.screenW - this.layout.focusBgW) / 2, y: 0, w: this.layout.focusBgW, h: this.layout.rowSingle,
      radius: this.layout.focusBgRadius, color: COLOR.focusBg, alpha: this.layout.focusBgAlpha,
    })
    this.focusBg.setProperty(prop.VISIBLE, false)
    this.glowTop = this.vc.createWidget(widget.IMG, glowParam(this.layout, 0, ASSET.focusGlowTop))
    this.glowBot = this.vc.createWidget(widget.IMG, glowParam(this.layout, 0, ASSET.focusGlowBot))
    this.glowTop.setProperty(prop.VISIBLE, false)
    this.glowBot.setProperty(prop.VISIBLE, false)
  }

  _createMasks() {
    for (const r of this._selectables) {
      if (!r.action) {
        this.focusables.push({
          action: () => {},
          focusTop: r.focusTop === undefined ? r.top : r.focusTop,
          focusH: r.focusH === undefined ? r.height : r.focusH,
          setFocus: () => {},
        })
        continue
      }

      let imageFocusSet = null
      if (r.kind === 'image' && r.selectable !== false) {
        const outer = this.vc.createWidget(widget.STROKE_RECT, {
          x: r._x, y: r._y, w: r.width, h: r.imageH, radius: r.radius, line_width: scaledValue(7, this.layout.scale), color: COLOR.footerBtnOuter,
        })
        const inner = this.vc.createWidget(widget.STROKE_RECT, {
          x: r._x, y: r._y, w: r.width, h: r.imageH, radius: r.radius, line_width: this.layout.imageFocusLine, color: COLOR.footerBtnInner,
        })
        outer.setProperty(prop.VISIBLE, false)
        inner.setProperty(prop.VISIBLE, false)
        imageFocusSet = (on) => { outer.setProperty(prop.VISIBLE, on); inner.setProperty(prop.VISIBLE, on) }
      }

      let mask
      if (r.kind === 'footerBtn') {
        mask = this.vc.createWidget(widget.FILL_RECT, {
          x: r.top, y: r._y, w: r.width, h: r.height, radius: r.round, color: COLOR.pressMask, alpha: 0,
        })
      } else if (r.kind === 'image') {
        mask = this.vc.createWidget(widget.FILL_RECT, {
          x: r._x, y: r._y, w: r.width, h: r.imageH, radius: r.radius, color: COLOR.pressMask, alpha: 0,
        })
      } else {
        mask = this.vc.createWidget(widget.FILL_RECT, {
          x: 0, y: r.top, w: this.layout.screenW, h: r.height, color: COLOR.pressMask, alpha: 0,
        })
      }
      r.mask = mask
      const t = tappable(mask, {
        tapMove: this.layout.tapMove,
        onTap: () => { if (!r.disabled && r.action) r.action() },
        onPressIn: () => { if (!r.disabled) { mask.setProperty(prop.ALPHA, this.layout.pressAlpha); this._activeTap = t } },
        onPressOut: () => { mask.setProperty(prop.ALPHA, 0); if (this._activeTap === t) this._activeTap = null },
      })

      const entry = {
        mask,
        action: () => { if (!r.disabled && r.action) r.action() },
        focusTop: r.focusTop === undefined ? r.top : r.focusTop,
        focusH: r.focusH === undefined ? r.height : r.focusH,
      }
      if (r.kind === 'footerBtn') {
        entry.setFocus = r.setFocus
      } else if (r.kind === 'image' && r.selectable !== false) {
        entry.setFocus = imageFocusSet
      } else if (r.kind === 'image') {
        entry.setFocus = () => {}
      } else {
        const rowTop = r.top, rowH = r.height
        entry.setFocus = (on) => {
          if (on) {
            this.focusBg.setProperty(prop.MORE, { x: (this.layout.screenW - this.layout.focusBgW) / 2, y: rowTop, w: this.layout.focusBgW, h: rowH, radius: this.layout.focusBgRadius, alpha: this.layout.focusBgAlpha })
            this.focusBg.setProperty(prop.VISIBLE, true)
            this.glowTop.setProperty(prop.MORE, glowParam(this.layout, rowTop, ASSET.focusGlowTop))
            this.glowBot.setProperty(prop.MORE, glowParam(this.layout, rowTop + rowH - this.layout.focusGlowH, ASSET.focusGlowBot))
            this.glowTop.setProperty(prop.VISIBLE, true)
            this.glowBot.setProperty(prop.VISIBLE, true)
          } else {
            this.focusBg.setProperty(prop.VISIBLE, false)
            this.glowTop.setProperty(prop.VISIBLE, false)
            this.glowBot.setProperty(prop.VISIBLE, false)
          }
        }
      }
      this.focusables.push(entry)
    }
  }

  _enableKeys() {
    if (this._keyCb) return this
    this._keyCb = (key, ev) => this._onKey(key, ev)
    onKey({ callback: this._keyCb })
    if (this.crownEnable && !this._crownCb) {
      this._crownCb = (key, degree) => this._onCrown(key, degree)
      try {
        onDigitalCrown({ callback: this._crownCb })
      } catch (e) {
        this._debugScroll('crown_register_error', undefined, 'err=' + this._debugValue(e))
        this._crownCb = null
      }
    }
    if (this.focusables.length) this._setFocus(0, false)
    return this
  }

  _onCrown(key, degree) {
    if (!this.crownEnable || this.focusables.length === 0 || typeof degree !== 'number') return false
    if (this._scrollAnim) { clearInterval(this._scrollAnim); this._scrollAnim = null }
    if (this._activeTap) { this._activeTap.cancel(); this._activeTap = null }
    if (!this._dragging) {
      this._dragging = true
      this._hideFocus()
    }

    const target = this._getScrollY() - degree * this.crownStep
    this._setScrollY(target)
    this._debugScroll('crown', undefined, 'crown_key=' + this._debugValue(key) + ' degree=' + degree + ' target=' + target)

    if (this._crownTimer) clearTimeout(this._crownTimer)
    this._crownTimer = setTimeout(() => {
      this._crownTimer = null
      if (!this._dragging) return
      this._dragging = false
      const idx = this._nearestToCenter()
      this._debugScroll('crown_settle', undefined, 'idx=' + idx)
      if (idx >= 0) {
        const changed = idx !== this.focusIdx
        this._setFocus(idx, false)
        if (changed) this._vibrateCrownSwitch()
      }
    }, this.crownSettleMs)
    return true
  }

  _vibrateCrownSwitch() {
    if (!this.crownVibrate) return
    try {
      if (!this._vibrator) this._vibrator = new Vibrator()
    } catch (e) {
      this._debugScroll('crown_vibrate_create_error', undefined, 'err=' + this._debugValue(e))
      return
    }

    try {
      if (typeof this._vibrator.getType === 'function') {
        const vibrationType = this._vibrator.getType()
        if (vibrationType && typeof vibrationType.STRONG_SHORT === 'number') {
          this._vibrator.start([{ type: vibrationType.STRONG_SHORT, duration: 20 }])
          return
        }
      }
    } catch (e) {
      this._debugScroll('crown_vibrate_scene_error', undefined, 'err=' + this._debugValue(e))
    }

    try {
      // Affected legacy firmware maps this documented duration mode to a tested short-medium pulse.
      this._vibrator.setMode(VIBRATOR_SCENE_DURATION)
      this._vibrator.start()
    } catch (e) {
      this._debugScroll('crown_vibrate_error', undefined, 'err=' + this._debugValue(e))
    }
  }

  _onKey(key, ev) {
    if (key === KEY_BACK && ev === KEY_EVENT_CLICK) {
      this.dispose()
      return false
    }
    if (this.focusables.length === 0) return false

    if (ev === KEY_EVENT_CLICK) {
      if (key === KEY_UP) { this._navigate(-1); return true }
      if (key === KEY_DOWN) { this._navigate(1); return true }
    }

    if (key === KEY_SELECT || key === KEY_HOME) {
      if (ev === KEY_EVENT_PRESS) {
        this._clickFallback = false
        if (this.focusIdx < 0) this._setFocus(0)
        this._pressing = true; this._cancelled = false
        this._pressTimer = setTimeout(() => { this._cancelled = true }, HOLD_MS)
        return true
      }
      if (ev === KEY_EVENT_RELEASE) {
        if (this._pressTimer) { clearTimeout(this._pressTimer); this._pressTimer = null }
        this._pressing = false
        if (!this._cancelled) this._fire()
        return true
      }
      if (ev === KEY_EVENT_CLICK) {
        if (this._clickFallback) {
          if (this.focusIdx < 0) this._setFocus(0)
          this._fire()
        }
        this._clickFallback = true
        return true
      }
    }
    return false
  }

  _fire() {
    const f = this.focusables[this.focusIdx]
    if (f) setTimeout(() => f.action(), 0)
  }

  _navigate(dir) {
    const n = this.focusables.length
    if (n === 0) return
    let idx
    if (this.focusIdx < 0) idx = dir < 0 ? n - 1 : 0
    else idx = (this.focusIdx + dir + n) % n
    this._setFocus(idx)
  }

  _setFocus(idx, scroll = true) {
    if (idx < 0 || idx >= this.focusables.length) return
    this._debugScroll('set_focus', undefined, 'idx=' + idx + ' scroll=' + (scroll ? 1 : 0))
    if (this.focusIdx >= 0 && this.focusIdx !== idx && this.focusables[this.focusIdx]) {
      this.focusables[this.focusIdx].setFocus(false)
    }
    this.focusIdx = idx
    const f = this.focusables[idx]
    if (!f) return
    f.setFocus(true)
    if (scroll) this._ensureVisible(f)
  }

  _hideFocus() {
    this._debugScroll('hide_focus')
    if (this.focusIdx >= 0 && this.focusables[this.focusIdx]) {
      this.focusables[this.focusIdx].setFocus(false)
    }
  }

  _debugValue(v) {
    if (v === undefined) return 'undefined'
    if (v === null) return 'null'
    if (typeof v === 'object') {
      try { return JSON.stringify(v) } catch (e) { return '[object]' }
    }
    return String(v)
  }

  _readScrollMorePos() {
    try {
      const more = this.vc.getProperty(prop.MORE, {}) || {}
      if (typeof more.pos_y === 'number') return { posY: more.pos_y, state: 'ok' }
      return { posY: undefined, state: 'missing' }
    } catch (e) {
      return { posY: undefined, state: 'error:' + this._debugValue(e) }
    }
  }

  _debugScroll(tag, frame, extra = '') {
    if (!this.debugScroll) return
    const read = this._readScrollMorePos()
    const scrollY = typeof read.posY === 'number' ? Math.max(0, -read.posY) : 'na'
    const frameText = frame === undefined ? '' : ' frame=' + this._debugValue(frame)
    console.log(
      '[ZOList.scroll] ' + tag +
      frameText +
      ' more_pos_y=' + this._debugValue(read.posY) +
      ' more_state=' + read.state +
      ' more_scroll_y=' + scrollY +
      ' cache=' + Math.round(this._scrollPos || 0) +
      ' focus=' + this.focusIdx +
      ' dragging=' + (this._dragging ? 1 : 0) +
      ' key=' + (this._keyScrolling ? 1 : 0) +
      (extra ? ' ' + extra : '')
    )
  }

  _clampScrollY(v) {
    const maxScroll = Math.max(0, this.cursor - this.h)
    return Math.max(0, Math.min(v || 0, maxScroll))
  }

  _syncScrollFromFrame(frame) {
    if (!frame || typeof frame.yoffset !== 'number') return undefined
    this._scrollPos = this._clampScrollY(-frame.yoffset * this.touchScrollStep)
    return this._scrollPos
  }

  _getScrollY() {
    this._scrollPos = this._clampScrollY(this._scrollPos || 0)
    return this._scrollPos
  }

  _setScrollY(v) {
    this._scrollPos = this._clampScrollY(v)
    const posY = -Math.round(this._scrollPos)
    try {
      this.vc.setProperty(prop.MORE, { pos_y: posY })
      this._debugScroll('set_scroll', undefined, 'target_scroll_y=' + Math.round(this._scrollPos) + ' target_pos_y=' + posY)
    } catch (e) {
      this._debugScroll('set_scroll_error', undefined, 'target_scroll_y=' + Math.round(this._scrollPos) + ' target_pos_y=' + posY + ' err=' + this._debugValue(e))
    }
  }

  _nearestToCenter() {
    const scrollY = this._getScrollY()
    const centerY = scrollY + this.h / 2
    let best = -1, bestD = Infinity
    for (let i = 0; i < this.focusables.length; i++) {
      const f = this.focusables[i]
      const d = Math.abs((f.focusTop + f.focusH / 2) - centerY)
      if (d < bestD) { bestD = d; best = i }
    }
    const f = best >= 0 ? this.focusables[best] : null
    this._debugScroll(
      'nearest',
      undefined,
      'scroll_y=' + scrollY +
      ' center_y=' + centerY +
      ' idx=' + best +
      ' dist=' + bestD +
      (f ? ' focus_top=' + f.focusTop + ' focus_h=' + f.focusH : '')
    )
    return best
  }

  _ensureVisible(f) {
    let target = (f.focusTop + f.focusH / 2) - this.h / 2
    const maxScroll = Math.max(0, this.cursor - this.h)
    target = Math.max(0, Math.min(target, maxScroll))
    this._animateScroll(target)
  }

  _animateScroll(target) {
    if (this._scrollAnim) { clearInterval(this._scrollAnim); this._scrollAnim = null }
    this._scrollPos = this._getScrollY()
    this._keyScrolling = true
    this._dragging = false
    this._debugScroll('animate_start', undefined, 'target=' + target)
    const step = () => {
      this._scrollPos += (target - this._scrollPos) * 0.35
      const done = Math.abs(target - this._scrollPos) < 0.5
      if (done) this._scrollPos = target
      this._setScrollY(this._scrollPos)
      if (done) {
        clearInterval(this._scrollAnim)
        this._scrollAnim = null
        this._keyScrolling = false
        this._debugScroll('animate_done', undefined, 'target=' + target)
      }
    }
    this._scrollAnim = setInterval(step, 16)
    step()
  }
}

export function createListPage(param = {}) {
  return new ListPage(param)
}

export function zolistDispose() {
  if (currentListPage) currentListPage.dispose()
}
