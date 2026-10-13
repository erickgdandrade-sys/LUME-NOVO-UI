import { z } from "zod/v4";
import {
  PlanoAdaptadoSchema,
  type AdaptarAulaResposta,
  type Anexo,
  type PerfilAnonimo,
} from "./plano-schema";
import { INSTRUCOES, montarPedido } from "./prompt-aula.server";

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/interactions";
const MODELOS_PADRAO = [
  "gemini-3.8-flash",
  "gemini-3.7-flash",
  "gemini-3.5-flash",
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
];

export function schemaParaGemini(schema: z.ZodType) {
  const { $schema: _ignorado, ...resto } = z.toJSONSchema(schema) as Record<string, unknown>;
  return resto;
}

const SCHEMA_PLANO = schemaParaGemini(PlanoAdaptadoSchema);

type RespostaInteracao = {
  steps?: { type?: string; content?: { type?: string; text?: string }[] }[];
  candidates?: { content?: { parts?: { text?: string }[] } }[];
  error?: { message?: string; status?: string };
};

const textoDeAnexo = (a: Anexo) => {
  const bytes = Uint8Array.from(atob(a.dados), (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
};

function entradaInteracao(texto: string, anexos: Anexo[]) {
  if (!anexos.length) return texto;
  return [
    { type: "text", text: texto },
    ...anexos.map((a) =>
      a.tipo === "text/plain"
        ? { type: "text", text: `Conteúdo do arquivo "${a.nome}":\n${textoDeAnexo(a)}` }
        : {
            type: a.tipo === "application/pdf" ? "document" : "image",
            data: a.dados,
            mime_type: a.tipo,
          },
    ),
  ];
}

function corpoGenerateContent(
  sistema: string,
  texto: string,
  anexos: Anexo[],
  schema: Record<string, unknown>,
) {
  return {
    systemInstruction: { parts: [{ text: sistema }] },
    contents: [
      {
        role: "user",
        parts: [
          { text: texto },
          ...anexos.map((a) =>
            a.tipo === "text/plain"
              ? { text: `Conteúdo do arquivo "${a.nome}":\n${textoDeAnexo(a)}` }
              : { inline_data: { mime_type: a.tipo, data: a.dados } },
          ),
        ],
      },
    ],
    generationConfig: { responseMimeType: "application/json", responseJsonSchema: schema },
  };
}

function modelos() {
  const escolhido = globalThis.process?.env?.["GEMINI_MODEL"];
  return escolhido ? [escolhido, ...MODELOS_PADRAO.filter((m) => m !== escolhido)] : MODELOS_PADRAO;
}

const ORDEM_DO_CHAT = [
  "gemini-3.5-flash-lite",
  "gemini-3.8-flash",
  "gemini-3.1-flash-lite",
  "gemini-3.7-flash",
  "gemini-3.5-flash",
];

function modelosDoChat() {
  const escolhido = globalThis.process?.env?.["GEMINI_MODEL"];
  const base = [...ORDEM_DO_CHAT, ...MODELOS_PADRAO.filter((m) => !ORDEM_DO_CHAT.includes(m))];
  return escolhido ? [escolhido, ...base.filter((m) => m !== escolhido)] : base;
}

export type PedidoJson = {
  sistema: string;
  pedido: string;
  anexos?: Anexo[];
  schema: Record<string, unknown>;
  tempoTotal?: number;
};

export type RespostaJson = { ok: true; texto: string } | { ok: false; erro: string };

export async function adaptarAulaComGemini(
  apiKey: string,
  plano: string,
  alunos: PerfilAnonimo[],
  anexos: Anexo[] = [],
): Promise<AdaptarAulaResposta> {
  const r = await gerarJsonComGemini(apiKey, {
    sistema: INSTRUCOES,
    pedido: montarPedido(
      plano,
      alunos,
      anexos.map((a) => a.nome),
    ),
    anexos,
    schema: SCHEMA_PLANO,
  });
  if (!r.ok) return r;
  try {
    return { ok: true, plano: PlanoAdaptadoSchema.parse(JSON.parse(r.texto)) };
  } catch (error) {
    console.error("Resposta do Gemini fora do formato:", r.texto.slice(0, 500), error);
    return { ok: false, erro: "A resposta da IA veio incompleta. Tente de novo." };
  }
}

export async function gerarJsonComGemini(
  apiKey: string,
  { sistema, pedido, anexos = [], schema, tempoTotal = 180_000 }: PedidoJson,
): Promise<RespostaJson> {
  const lista = modelos();
  let formatoClassico = false;
  let res: Response | undefined;
  let corpo: RespostaInteracao = {};
  let modelo = lista[0] ?? "gemini-3.8-flash";
  const inicio = Date.now();

  for (const m of lista) {
    const restante = tempoTotal - (Date.now() - inicio);
    if (restante < 20_000) break;
    modelo = m;
    try {
      res = await fetch(
        formatoClassico
          ? `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`
          : ENDPOINT,
        {
          method: "POST",
          headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
          body: JSON.stringify(
            formatoClassico
              ? corpoGenerateContent(sistema, pedido, anexos, schema)
              : {
                  model: m,
                  system_instruction: sistema,
                  input: entradaInteracao(pedido, anexos),
                  response_format: { type: "text", mime_type: "application/json", schema },
                  store: false,
                },
          ),
          signal: AbortSignal.timeout(Math.min(anexos.length ? 120_000 : 90_000, restante)),
        },
      );
    } catch (error) {
      console.error("Gemini", m, error);
      res = undefined;
      if (error instanceof Error && error.name === "TimeoutError") continue;
      return { ok: false, erro: "Não foi possível conectar à IA. Verifique sua internet." };
    }

    const bruto: unknown = await res.json().catch(() => ({}));
    corpo = (Array.isArray(bruto) ? (bruto[0] ?? {}) : bruto) as RespostaInteracao;
    if (res.ok) break;
    console.error("Gemini", m, res.status, JSON.stringify(corpo).slice(0, 1000));
    if (
      res.status === 400 &&
      anexos.length &&
      !formatoClassico &&
      !/api[_ ]?key/i.test(corpo.error?.message ?? "")
    ) {
      formatoClassico = true;
      const tentativa = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`,
        {
          method: "POST",
          headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
          body: JSON.stringify(corpoGenerateContent(sistema, pedido, anexos, schema)),
          signal: AbortSignal.timeout(Math.min(120_000, tempoTotal - (Date.now() - inicio))),
        },
      ).catch((e: unknown) => {
        console.error("Gemini (formato clássico)", m, e);
        return undefined;
      });
      if (tentativa) {
        res = tentativa;
        const b2: unknown = await res.json().catch(() => ({}));
        corpo = (Array.isArray(b2) ? (b2[0] ?? {}) : b2) as RespostaInteracao;
        if (res.ok) break;
        console.error(
          "Gemini (formato clássico)",
          m,
          res.status,
          JSON.stringify(corpo).slice(0, 1000),
        );
      }
    }
    if (res.status !== 503 && res.status !== 429 && res.status !== 404) break;
  }

  if (!res?.ok) {
    const status = res?.status ?? 0;
    if (status === 429) {
      return {
        ok: false,
        erro: "Limite gratuito da IA atingido por agora. Aguarde um minuto e tente de novo.",
      };
    }
    if (status === 400 && /api[_ ]?key/i.test(corpo.error?.message ?? "")) {
      console.error(
        `Chave recusada: ${apiKey.length} caracteres, começa com "${apiKey.slice(0, 4)}"`,
      );
      return { ok: false, erro: "A chave do Gemini é inválida. Confira a GEMINI_API_KEY." };
    }
    if (status === 401 || status === 403) {
      return { ok: false, erro: "A chave do Gemini foi recusada. Confira a GEMINI_API_KEY." };
    }
    if (status === 404) {
      return {
        ok: false,
        erro: `O modelo "${modelo}" não está disponível. Defina outro em GEMINI_MODEL.`,
      };
    }
    return {
      ok: false,
      erro: "A IA gratuita está sobrecarregada agora. Aguarde alguns segundos e tente de novo.",
    };
  }

  const texto = corpo.candidates
    ? (corpo.candidates[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("")
    : (corpo.steps ?? [])
        .filter((s) => s.type === "model_output")
        .flatMap((s) => s.content ?? [])
        .filter((c) => c.type === "text" && c.text)
        .map((c) => c.text)
        .join("");
  return { ok: true, texto };
}

export async function conversarComGemini(
  apiKey: string,
  sistema: string,
  conversa: string,
): Promise<{ ok: true; texto: string } | { ok: false; erro: string }> {
  const inicio = Date.now();
  let ultimoStatus = 0;
  const lista = [...modelosDoChat(), ...modelosDoChat()];
  for (const [i, m] of lista.entries()) {
    if (i === lista.length / 2) await new Promise((r) => setTimeout(r, 1500));
    const restante = 55_000 - (Date.now() - inicio);
    if (restante < 6_000) break;
    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: m,
          system_instruction: sistema,
          input: conversa,
          store: false,
        }),
        signal: AbortSignal.timeout(Math.min(15_000, restante)),
      });
      ultimoStatus = res.status;
      const bruto: unknown = await res.json().catch(() => ({}));
      const corpo = (Array.isArray(bruto) ? (bruto[0] ?? {}) : bruto) as RespostaInteracao;
      if (res.ok) {
        const texto = (corpo.steps ?? [])
          .filter((s) => s.type === "model_output")
          .flatMap((s) => s.content ?? [])
          .filter((c) => c.type === "text" && c.text)
          .map((c) => c.text)
          .join("")
          .trim();
        if (texto) return { ok: true, texto };
        console.error("Gemini chat", m, "resposta sem texto", JSON.stringify(corpo).slice(0, 500));
      } else {
        console.error("Gemini chat", m, res.status, JSON.stringify(corpo).slice(0, 500));
        if (res.status === 401 || res.status === 403) break;
      }
    } catch (error) {
      console.error("Gemini chat", m, error);
    }
  }
  return {
    ok: false,
    erro:
      ultimoStatus === 429
        ? "A Lumis está com muitas perguntas agora. Tente de novo em um minuto."
        : "A Lumis está com muita procura agora. Tente de novo daqui a pouco.",
  };
}
