/**
 * 网络工具：ip sort — 网络工具
 */

export const name = "dsh-net-ip-sort";
export const inject = ["tools"];

const NL = String.fromCharCode(10);
const SITE = "https://deepseekbase.com/zh/tools/";
const TEXT_OUTPUT = {
  schema: { type: "object", additionalProperties: false, properties: { text: { type: "string" } }, required: ["text"] },
  render: (_args, value) => [{ type: "text", text: (value && value.text) || "" }],
};

function ip4(t) {
  const s = String(t).trim();
  const p = s.split(".");
  if (p.length !== 4) throw new Error("IPv4 格式错误");
  const n = p.map((x) => { if (!/^\d+$/.test(x) || Number(x) > 255) throw new Error("IPv4 段错误: " + x); return Number(x); });
  return n;
}
function intOf(t) { return ip4(t).reduce((a, b) => (a << 8) + b, 0) >>> 0; }
function ipOf(n) { n = n >>> 0; return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join("."); }
function parseCidr(t) { const m = String(t).trim().match(/^([\d.]+)\/(\d+)$/); if (!m) throw new Error("格式如 192.168.1.0/24"); const p = Number(m[2]); if (p < 0 || p > 32) throw new Error("前缀需 0–32"); const base = intOf(m[1]); const mask = p === 0 ? 0 : (0xFFFFFFFF << (32 - p)) >>> 0; return { net: (base & mask) >>> 0, prefix: p, mask }; }

const OPS = {
  ip_validate: (t) => { try { ip4(t); return "合法 IPv4"; } catch (e) { return "非法: " + e.message; } },
  ip_to_int: (t) => String(intOf(t)),
  int_to_ip: (t) => ipOf(Number(t)),
  ip_class: (t) => { const [a] = ip4(t); return a < 128 ? "A 类" : a < 192 ? "B 类" : a < 224 ? "C 类" : a < 240 ? "D 类（组播）" : "E 类（保留）"; },
  ip_private: (t) => { const n = intOf(t); return ((n >>> 24) === 10 || (n >>> 20) === (172 * 16 + 1) || (n >>> 16) === (192 * 256 + 168)) ? "私有地址" : "公网地址"; },
  ip_loopback: (t) => { const n = intOf(t); return (n >>> 24) === 127 ? "回环地址" : "非回环"; },
  ip_sort: (t) => String(t).split(/[\s,]+/).filter(Boolean).sort((a, b) => intOf(a) - intOf(b)).join(NL),
  cidr_parse: (t) => { const c = parseCidr(t); const bc = (c.net | (~c.mask >>> 0)) >>> 0; return "网段: " + ipOf(c.net) + "/" + c.prefix + NL + "掩码: " + ipOf(c.mask) + NL + "广播: " + ipOf(bc) + NL + "可用主机: " + Math.max(0, bc - c.net - 1) + "（含网关）"; },
  subnet_calc: (t, a) => { const c = parseCidr(String(t).includes("/") ? t : String(t) + "/" + String(a || 24)); return OPS.cidr_parse(ipOf(c.net) + "/" + c.prefix); },
  cidr_contains: (t, a) => { const c = parseCidr(a); const n = intOf(t); return ((n & c.mask) >>> 0) === c.net ? "在网段内" : "不在网段内"; },
  cidr_size: (t) => { const c = parseCidr(t); return "地址数: " + Math.pow(2, 32 - c.prefix) + "，可用主机: " + Math.max(0, Math.pow(2, 32 - c.prefix) - 2); },
  cidr_split: (t, a) => { const c = parseCidr(t); const n = Math.min(8, Math.max(1, Number(a) || 2)); const p = c.prefix + Math.round(Math.log2(n)); const size = Math.pow(2, 32 - p); return Array.from({ length: n }, (x, i) => ipOf(c.net + i * size) + "/" + p).join(NL); },
  netmask_to_prefix: (t) => { const m = intOf(t); let p = 0; for (let i = 31; i >= 0; i--) { if ((m >>> i) & 1) p++; else break; } return "前缀: /" + p; },
  prefix_to_netmask: (t) => ipOf(Number(t) === 0 ? 0 : (0xFFFFFFFF << (32 - Number(t))) >>> 0),
  wildcard_mask: (t) => ipOf(~intOf(t) >>> 0),
  ip_in_range: (t, a) => { const m = String(a).match(/^([\d.]+)\s*[-~]\s*([\d.]+)$/); if (!m) throw new Error("格式如 10.0.0.1-10.0.0.9"); const n = intOf(t); return n >= intOf(m[1]) && n <= intOf(m[2]) ? "在范围内" : "不在范围"; },
  host_port_split: (t) => { const m = String(t).trim().match(/^([^:]+):(\d+)$/); return m ? "主机: " + m[1] + NL + "端口: " + m[2] : "格式如 host:port"; },
  port_validate: (t) => { const n = Number(t); return Number.isInteger(n) && n >= 0 && n <= 65535 ? "合法端口" : "非法端口"; },
  port_range_parse: (t) => { const m = String(t).match(/^(\d+)[-:](\d+)$/); if (!m) throw new Error("格式如 8000-8100"); const a = Number(m[1]), b = Number(m[2]); return "端口数: " + (b - a + 1); },
  mac_validate: (t) => /^([0-9a-fA-F]{2}[:-]){5}[0-9a-fA-F]{2}$/.test(String(t).trim()) ? "合法 MAC" : "非法 MAC",
  mac_normalize: (t) => String(t).trim().toUpperCase().replace(/-/g, ":"),
  mac_to_int: (t) => String(t).replace(/[:-]/g, "").toUpperCase(),
  ipv6_validate: (t) => /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/.test(String(t).trim()) || /::/.test(String(t)) ? "看起来是 IPv6（未做完整校验）" : "不是 IPv6",
  ipv4_to_ipv6: (t) => "::ffff:" + ip4(t).join("."),
  ip_to_binary: (t) => ip4(t).map((x) => x.toString(2).padStart(8, "0")).join("."),
  ip_to_hex: (t) => "0x" + intOf(t).toString(16).padStart(8, "0").toUpperCase(),
  cidr_overlap: (t, a) => { const x = parseCidr(t), y = parseCidr(a); const xb = (x.net | (~x.mask >>> 0)) >>> 0, yb = (y.net | (~y.mask >>> 0)) >>> 0; return x.net <= yb && y.net <= xb ? "有重叠" : "不重叠"; },
  ip_count_range: (t, a) => { const m = String(a).match(/^([\d.]+)\s*[-~]\s*([\d.]+)$/); if (!m) throw new Error("格式如 10.0.0.1-10.0.0.9"); return "地址数: " + (intOf(m[2]) - intOf(m[1]) + 1); },
  reserved_check: (t) => {
    const n = intOf(t); const f = (n >>> 24);
    if (f === 10 || (n >>> 20) === (172 * 16 + 1) || (n >>> 16) === (192 * 256 + 168)) return "私有地址（RFC1918）";
    if (f === 127) return "回环";
    if (f === 169 && ((n >>> 16) & 255) === 254) return "链路本地";
    if (f >= 224 && f <= 239) return "组播";
    if (f >= 240) return "保留";
    if (n === 0) return "未指定";
    return "公网地址";
  },
};

export function apply(ctx, config) {
  void config;
  ctx.tools.register({
    name: "net_ip_sort",
    description: "ip sort",
    parameters: {
      text: { "type": "string", required: true, "description": "输入" },
    },
    output: TEXT_OUTPUT,
    async execute(args) {
      const t = args && args.text != null ? String(args.text) : "";
      const a = args && args.a != null ? String(args.a) : "";
      try {
        const fn = OPS["ip_sort"];
        if (!fn) throw new Error("未知操作");
        return { text: ["网络工具：ip sort", "=".repeat(52), String(fn(t, a)), "", "更多工具：" + SITE].join(NL) };
      } catch (e) {
        return { text: "处理失败: " + String((e && e.message) || e) };
      }
    },
  });
}
