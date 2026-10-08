import { gerarAnalise, type PricingResult } from '../utils/pricing';
import { brl, pctFmt } from '../utils/format';
import { Aviso, STATUS_INFO } from './ui';

export default function ResultadoPreco({ r, metaFaturamento = 5000 }: { r: Extract<PricingResult, { ok: true }>; metaFaturamento?: number }) {
  const s = STATUS_INFO[r.status];
  const analise = gerarAnalise(r, metaFaturamento);
  return (
    <div className="pop space-y-4">
      <div className="overflow-hidden rounded-card bg-gradient-to-br from-rosa-escuro via-rosa to-roxo p-6 text-white shadow-suave">
        <p className="text-sm font-bold opacity-90">PREÇO RECOMENDADO</p>
        <p className="mt-1 text-5xl font-extrabold tracking-tight" aria-live="polite">{brl(r.precoRecomendado)}</p>
        <span className={`mt-3 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-extrabold ring-1 ${s.cor}`}>
          <span aria-hidden>{s.emoji}</span>{s.texto}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Mini rotulo="Custo total" valor={brl(r.custoTotal)} />
        <Mini rotulo="Lucro por unidade" valor={brl(r.lucroUnitario)} />
        <Mini rotulo="Margem" valor={pctFmt(r.margem)} />
        <Mini rotulo="Preço mínimo" valor={brl(r.precoMinimo)} dica="Abaixo disso você tem prejuízo" />
        <Mini rotulo="Faturamento projetado" valor={brl(r.faturamentoMensal)} />
        <Mini rotulo="Lucro projetado" valor={brl(r.lucroMensal)} />
      </div>

      <div className="card space-y-2">
        <p className="font-extrabold">Análise do seu preço</p>
        {analise.map((a, i) =>
          i < 3 ? <p key={i} className="text-sm text-gray-700">{a.texto}</p> : <Aviso key={i} tom={a.tom === 'perigo' ? 'perigo' : a.tom === 'alerta' ? 'alerta' : 'ok'}>{a.texto}</Aviso>
        )}
        <p className="pt-1 text-xs text-gray-500">Análise gerencial. Não substitui orientação contábil ou tributária.</p>
      </div>
    </div>
  );
}

function Mini({ rotulo, valor, dica }: { rotulo: string; valor: string; dica?: string }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-suave ring-1 ring-black/[0.03]">
      <p className="text-xs font-semibold text-gray-600">{rotulo}</p>
      <p className="mt-0.5 text-lg font-extrabold">{valor}</p>
      {dica && <p className="text-[11px] text-gray-500">{dica}</p>}
    </div>
  );
}
