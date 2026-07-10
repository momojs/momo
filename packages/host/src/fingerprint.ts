/**
 * 生成 Canvas 指纹（部分浏览器禁用 Canvas 会返回`no_canvas`）
 * @returns {string} Canvas 指纹
 */
function canvas() {
  try {
    const ins = globalThis.document.createElement('canvas');
    const ctx = ins.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#f60';
      ctx.fillRect(0, 0, 12, 12);
      ctx.fillStyle = '#069';
      ctx.font = '12px Arial';
      ctx.fillText('Fingerprint', 2, 15);
    }
    return ins.toDataURL().slice(22); // 提取 Base64 数据部分
  } catch (_) {
    return 'no_canvas';
  }
}

/**
 * 获取 WebGL 供应商/渲染器信息
 * @returns {string} WebGL 供应商/渲染器信息
 */
function vendor() {
  try {
    const gl = globalThis.document.createElement('canvas').getContext('webgl');
    return [
      //
      gl?.getParameter(gl.VENDOR),
      gl?.getParameter(gl.RENDERER),
    ].join('|');
  } catch (_) {
    return 'no_webgl';
  }
}

/**
 * 生成音频指纹（部分浏览器限制）
 * @returns {string} 音频指纹
 */
function audio() {
  try {
    if (!globalThis.AudioContext) return 'no_audio';

    const ctx = new globalThis.AudioContext();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    gain.gain.value = 0; // 静音避免干扰用户
    return [ctx.sampleRate, oscillator.type].join('|');
  } catch (_) {
    return 'no_audio';
  }
}

/**
 * 获取字体列表（异步，可能不准确）
 * @returns {Promise<string[]>} 字体列表
 */
function fonts() {
  try {
    if (!globalThis.document?.fonts) return Promise.resolve([]);

    return Promise.all(
      ['Arial', 'Times New Roman', 'Courier New', 'Verdana'].map(async (font) =>
        globalThis.document.fonts.load(`12px "${font}"`),
      ),
    );
  } catch {
    return Promise.resolve([]);
  }
}

/**
 * 一个简易的浏览器指纹生成器
 * @returns {Promise<string>} 浏览器指纹
 */
export async function projection(): Promise<string> {
  const navigation = globalThis.performance?.getEntriesByType('navigation')[0];
  // 组合浏览器参数（避免敏感信息）
  const params = {
    userAgent: globalThis.navigator?.userAgent,
    language: globalThis.navigator?.language,
    canvas: canvas(),
    screen: { ...globalThis.screen },
    webglVendor: vendor(),
    audioContextHash: audio(),
    installedFonts: await fonts(),
    timezone: new Date().getTimezoneOffset(),
    ...(navigation ?? {}),
  };
  const paramsString = JSON.stringify(params);
  const encoder = new TextEncoder();
  const data = encoder.encode(paramsString);
  const buffer = await globalThis.crypto.subtle.digest('SHA-1', data);
  const hashed = Array.from(new Uint8Array(buffer));
  return hashed.map((b) => b.toString(16).padStart(2, '0')).join('');
}
