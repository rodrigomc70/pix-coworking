// =====================================================
// CONFIGURAÇÃO: é só aqui que você mexe
// =====================================================
const CONFIG = {
  chave:  "+5561982273627",   // sua chave Pix
  nome:   "Coworking Terapia", // nome no código Pix (máx. 25 caracteres, sem acentos)
  cidade: "Brasilia"           // cidade (máx. 15 caracteres, sem acentos)
};
// =====================================================

function tlv(id, valor) { return id + String(valor.length).padStart(2, "0") + valor; }

function limpa(texto, max) {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9 ]/g, " ").replace(/\s+/g, " ").trim().toUpperCase().slice(0, max);
}

function crc16(str) {
  let crc = 0xFFFF;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1);
      crc &= 0xFFFF;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function montaPix(chave, nome, cidade, valor, txid) {
  const p =
    tlv("00", "01") +
    tlv("01", "11") +
    tlv("26", tlv("00", "br.gov.bcb.pix") + tlv("01", chave)) +
    tlv("52", "0000") +
    tlv("53", "986") +
    tlv("54", valor.toFixed(2)) +
    tlv("58", "BR") +
    tlv("59", limpa(nome, 25)) +
    tlv("60", limpa(cidade, 15)) +
    tlv("62", tlv("05", txid || "***")) +
    "6304";
  return p + crc16(p);
}

// Retorna: null = valor não informado | NaN = valor inválido | número = valor ok
function lerValor(texto) {
  if (texto === null || texto === undefined) return null;
  const t = String(texto).trim();
  if (t === "") return null;
  if (!/^\d{1,7}([.,]\d{1,2})?$/.test(t)) return NaN;
  const n = Number(t.replace(",", "."));
  if (!(n > 0)) return NaN;
  return Math.round(n * 100) / 100;
}

document.addEventListener("DOMContentLoaded", function () {
  const elValor  = document.getElementById("valor-pix");
  const elCodigo = document.getElementById("copia-cola");
  const elQr     = document.getElementById("qrcode");
  const btn      = document.getElementById("btn-copiar");

  const params = new URLSearchParams(window.location.search);
  const valor  = lerValor(params.get("valor"));
  const txid   = (params.get("ref") || "").replace(/[^A-Za-z0-9]/g, "").slice(0, 25) || "***";

  // Sem valor ou valor inválido: não gera Pix (nada de cobrar um valor por engano)
  if (valor === null || Number.isNaN(valor)) {
    elValor.textContent = (valor === null) ? "Valor não informado" : "Valor inválido";
    elCodigo.value = "Peça um novo link de pagamento ao Coworking Terapia.";
    elQr.style.display = "none";
    btn.disabled = true;
    btn.style.opacity = "0.5";
    btn.style.cursor = "not-allowed";
    return;
  }

  const codigo = montaPix(CONFIG.chave, CONFIG.nome, CONFIG.cidade, valor, txid);

  elValor.textContent = valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  elCodigo.value = codigo;

  new QRCode(elQr, {
    text: codigo,
    width: 200,
    height: 200,
    colorDark: "#333333",
    colorLight: "#ffffff",
    correctLevel: QRCode.CorrectLevel.M
  });

  btn.addEventListener("click", function () {
    const ok = function () {
      btn.textContent = "Copiado!";
      setTimeout(function () { btn.textContent = "Copiar Código"; }, 2000);
    };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(codigo).then(ok);
    } else {
      elCodigo.select();
      elCodigo.setSelectionRange(0, 99999);
      document.execCommand("copy");
      ok();
    }
  });
});