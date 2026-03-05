import { useState, useRef, useEffect } from 'react'

const SENHA_PAINEL = "curseduca2025"

// ── Utilitários de storage ──────────────────────────────────────────────────
const getVagas = () => JSON.parse(localStorage.getItem("vagas") || "[]")
const setVagas = (v) => localStorage.setItem("vagas", JSON.stringify(v))
const getCandidatos = () => JSON.parse(localStorage.getItem("candidatos") || "[]")
const setCandidatos = (c) => localStorage.setItem("candidatos", JSON.stringify(c))

// ── Avaliação via Claude API ────────────────────────────────────────────────
async function avaliarRespostas(apiKey, nome, vaga, perguntas, respostas) {
  const prompt = `Você é um recrutador especialista da Curseduca, uma EdTech brasileira em crescimento.
Avalie as respostas do candidato "${nome}" para a vaga de ${vaga}.

${respostas.map((r, i) => `Pergunta ${i+1}: ${perguntas[i]}\nResposta: ${r.texto}\n`).join('\n')}

Critérios: comunicação clara, exemplos concretos, fit cultural com startup, motivação genuína.

Responda APENAS em JSON válido:
{"score":<0-100>,"classificacao":"<✅ Avança | 🟡 Talvez | ❌ Não avança>","pontos_fortes":["..."],"alertas":["..."],"resumo":"<2 frases>"}`

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }]
      })
    })
    const data = await res.json()
    if (data.error) throw new Error(data.error.message)
    const text = data.content?.[0]?.text || "{}"
    return JSON.parse(text.replace(/```json|```/g, "").trim())
  } catch {
    return { score: 50, classificacao: "🟡 Talvez", pontos_fortes: [], alertas: ["Avaliação automática indisponível"], resumo: "Avalie manualmente." }
  }
}

// ── Tela Candidato ──────────────────────────────────────────────────────────
function TelaCandidato({ vagaId, apiKey }) {
  const [vaga, setVaga] = useState(null)
  const [nome, setNome] = useState("")
  const [iniciado, setIniciado] = useState(false)
  const [pergAtual, setPergAtual] = useState(0)
  const [respostas, setRespostas] = useState([])
  const [texto, setTexto] = useState("")
  const [gravando, setGravando] = useState(false)
  const [avaliando, setAvaliando] = useState(false)
  const [concluido, setConcluido] = useState(false)
  const [erro, setErro] = useState("")
  const recRef = useRef(null)

  useEffect(() => {
    const vagas = getVagas()
    const v = vagas.find(x => x.id === vagaId)
    if (v) setVaga(v)
    else setErro("Vaga não encontrada. Verifique o link.")
  }, [vagaId])

  const iniciarGravacao = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { alert("Use o Google Chrome para gravar voz, ou digite sua resposta."); return }
    const r = new SR()
    r.lang = 'pt-BR'; r.continuous = true; r.interimResults = true
    r.onresult = (e) => setTexto(Array.from(e.results).map(x => x[0].transcript).join(''))
    r.onerror = (e) => { if (e.error !== 'aborted') alert("Erro: " + e.error); setGravando(false) }
    r.onend = () => setGravando(false)
    recRef.current = r; r.start(); setGravando(true)
  }

  const pararGravacao = () => { recRef.current?.stop(); setGravando(false) }

  const enviar = async () => {
    if (!texto.trim()) return
    if (gravando) pararGravacao()
    const novas = [...respostas, { texto: texto.trim() }]
    setRespostas(novas); setTexto("")
    if (pergAtual + 1 < vaga.perguntas.length) {
      setPergAtual(pergAtual + 1)
    } else {
      setAvaliando(true)
      const aval = await avaliarRespostas(apiKey, nome, vaga.titulo, vaga.perguntas, novas)
      const lista = getCandidatos()
      lista.push({ nome, vagaId: vaga.id, vagaTitulo: vaga.titulo, respostas: novas, avaliacao: aval, data: new Date().toLocaleDateString("pt-BR") })
      setCandidatos(lista)
      setAvaliando(false); setConcluido(true)
    }
  }

  const s = {
    page: { minHeight:'100vh', background:'linear-gradient(135deg,#0f172a,#1e293b)', display:'flex', alignItems:'center', justifyContent:'center', padding:'20px', fontFamily:'system-ui,sans-serif' },
    box: { background:'white', borderRadius:'16px', padding:'40px', maxWidth:'600px', width:'100%', boxShadow:'0 25px 50px rgba(0,0,0,.3)' },
    btn: { background:'#7c3aed', color:'white', border:'none', borderRadius:'10px', padding:'14px', fontSize:'16px', fontWeight:'600', cursor:'pointer', width:'100%', marginTop:'16px' },
    btnR: { background:'#dc2626', color:'white', border:'none', borderRadius:'10px', padding:'12px 20px', fontSize:'14px', fontWeight:'600', cursor:'pointer' },
    btnG: { background:'#f1f5f9', color:'#475569', border:'none', borderRadius:'10px', padding:'12px 20px', fontSize:'14px', fontWeight:'600', cursor:'pointer' },
    inp: { width:'100%', padding:'12px 16px', border:'2px solid #e2e8f0', borderRadius:'10px', fontSize:'16px', boxSizing:'border-box', outline:'none' },
    ta: { width:'100%', padding:'12px 16px', border:'2px solid #e2e8f0', borderRadius:'10px', fontSize:'15px', boxSizing:'border-box', minHeight:'120px', resize:'vertical', outline:'none', fontFamily:'inherit' },
    bar: { background:'#e2e8f0', borderRadius:'99px', height:'8px', margin:'0 0 32px' },
    barIn: (p) => ({ background:'#7c3aed', borderRadius:'99px', height:'8px', width:`${p}%`, transition:'width .4s' }),
    qbox: { background:'#f8fafc', borderRadius:'12px', padding:'20px', margin:'0 0 24px', borderLeft:'4px solid #7c3aed' },
    badge: { display:'inline-block', background:'#ede9fe', color:'#7c3aed', borderRadius:'99px', padding:'4px 12px', fontSize:'12px', fontWeight:'600', margin:'0 0 16px' },
    row: { display:'flex', gap:'12px', marginTop:'16px', alignItems:'center' }
  }

  if (erro) return <div style={s.page}><div style={{...s.box,textAlign:'center'}}><div style={{fontSize:'48px',marginBottom:'16px'}}>❌</div><p style={{color:'#dc2626'}}>{erro}</p></div></div>
  if (!vaga) return <div style={s.page}><div style={{...s.box,textAlign:'center'}}><div style={{fontSize:'32px'}}>⏳</div></div></div>
  if (concluido) return <div style={s.page}><div style={{...s.box,textAlign:'center'}}><div style={{fontSize:'64px',marginBottom:'16px'}}>✅</div><h2 style={{fontSize:'22px',fontWeight:'700',color:'#0f172a'}}>Triagem concluída!</h2><p style={{color:'#64748b',marginTop:'8px'}}>Obrigado, {nome}! Nossa equipe entrará em contato em breve.</p></div></div>
  if (avaliando) return <div style={s.page}><div style={{...s.box,textAlign:'center'}}><div style={{fontSize:'48px',marginBottom:'16px'}}>⏳</div><h2 style={{fontSize:'22px',fontWeight:'700'}}>Analisando respostas...</h2></div></div>

  if (!iniciado) return (
    <div style={s.page}>
      <div style={s.box}>
        <div style={{textAlign:'center',marginBottom:'32px'}}>
          <div style={{fontSize:'48px',marginBottom:'12px'}}>👋</div>
          <h1 style={{fontSize:'24px',fontWeight:'700',color:'#0f172a',margin:'0 0 8px'}}>{vaga.titulo}</h1>
          <p style={{color:'#64748b',fontSize:'14px',margin:0}}>Curseduca • Processo Seletivo</p>
        </div>
        <p style={{color:'#475569',marginBottom:'24px',lineHeight:'1.6'}}>Você vai responder <strong>{vaga.perguntas.length} perguntas</strong> — pode digitar ou usar sua voz (Chrome). Fale naturalmente, sem roteiro.</p>
        <input style={s.inp} placeholder="Seu nome completo" value={nome} onChange={e=>setNome(e.target.value)} onKeyDown={e=>e.key==='Enter'&&nome.trim()&&setIniciado(true)} />
        <button style={{...s.btn,opacity:nome.trim()?1:.5}} onClick={()=>nome.trim()&&setIniciado(true)}>Começar →</button>
      </div>
    </div>
  )

  return (
    <div style={s.page}>
      <div style={s.box}>
        <span style={s.badge}>Pergunta {pergAtual+1} de {vaga.perguntas.length}</span>
        <div style={s.bar}><div style={s.barIn((pergAtual/vaga.perguntas.length)*100)} /></div>
        <div style={s.qbox}><p style={{margin:0,fontSize:'17px',fontWeight:'600',color:'#1e293b',lineHeight:'1.5'}}>{vaga.perguntas[pergAtual]}</p></div>
        <textarea style={s.ta} placeholder="Digite sua resposta aqui..." value={texto} onChange={e=>setTexto(e.target.value)} />
        {gravando && <p style={{color:'#dc2626',fontSize:'13px',marginTop:'8px'}}>🔴 Gravando... clique "Parar" quando terminar.</p>}
        <div style={s.row}>
          {!gravando ? <button style={s.btnG} onClick={iniciarGravacao}>🎙 Gravar voz</button> : <button style={s.btnR} onClick={pararGravacao}>⏹ Parar</button>}
          <button style={{...s.btn,marginTop:0,flex:1,opacity:texto.trim()?1:.4}} onClick={enviar} disabled={!texto.trim()}>
            {pergAtual+1 < vaga.perguntas.length ? 'Próxima →' : 'Enviar ✓'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Painel G&C ──────────────────────────────────────────────────────────────
function Painel({ onVoltar, apiKey }) {
  const [senha, setSenha] = useState("")
  const [auth, setAuth] = useState(false)
  const [aba, setAba] = useState("vagas") // vagas | candidatos
  const [vagas, setVagasState] = useState([])
  const [candidatos, setCandidatosState] = useState([])
  const [vagaFiltro, setVagaFiltro] = useState("todas")
  const [filtro, setFiltro] = useState("todos")
  const [exp, setExp] = useState(null)
  const [novaVaga, setNovaVaga] = useState({ titulo: "", perguntas: ["", "", "", ""] })
  const [criando, setCriando] = useState(false)
  const [linkCopiado, setLinkCopiado] = useState("")

  useEffect(() => {
    if (auth) {
      setVagasState(getVagas())
      setCandidatosState(getCandidatos())
    }
  }, [auth])

  const salvarVaga = () => {
    if (!novaVaga.titulo.trim()) return alert("Dê um nome para a vaga.")
    const pergs = novaVaga.perguntas.filter(p => p.trim())
    if (pergs.length < 1) return alert("Adicione pelo menos 1 pergunta.")
    const id = "vaga_" + Date.now()
    const nova = { id, titulo: novaVaga.titulo.trim(), perguntas: pergs, criadaEm: new Date().toLocaleDateString("pt-BR") }
    const lista = [...getVagas(), nova]
    setVagas(lista); setVagasState(lista)
    setNovaVaga({ titulo: "", perguntas: ["", "", "", ""] })
    setCriando(false)
    alert(`Vaga "${nova.titulo}" criada!`)
  }

  const excluirVaga = (id) => {
    if (!confirm("Excluir esta vaga?")) return
    const lista = getVagas().filter(v => v.id !== id)
    setVagas(lista); setVagasState(lista)
  }

  const copiarLink = (id) => {
    const link = `${window.location.origin}?vaga=${id}`
    navigator.clipboard.writeText(link)
    setLinkCopiado(id)
    setTimeout(() => setLinkCopiado(""), 2000)
  }

  const atualizarPergunta = (i, val) => {
    const p = [...novaVaga.perguntas]; p[i] = val
    setNovaVaga({ ...novaVaga, perguntas: p })
  }

  const s = {
    page: { minHeight:'100vh', background:'#f8fafc', fontFamily:'system-ui,sans-serif', padding:'32px 20px' },
    inner: { maxWidth:'900px', margin:'0 auto' },
    card: { background:'white', borderRadius:'12px', padding:'20px', marginBottom:'16px', boxShadow:'0 1px 3px rgba(0,0,0,.1)' },
    btn: { background:'#7c3aed', color:'white', border:'none', borderRadius:'8px', padding:'10px 20px', fontSize:'14px', fontWeight:'600', cursor:'pointer' },
    btnSm: { background:'#7c3aed', color:'white', border:'none', borderRadius:'6px', padding:'6px 14px', fontSize:'13px', fontWeight:'600', cursor:'pointer' },
    btnOut: { background:'white', color:'#475569', border:'1px solid #e2e8f0', borderRadius:'8px', padding:'10px 20px', fontSize:'14px', cursor:'pointer' },
    btnDel: { background:'#fee2e2', color:'#dc2626', border:'none', borderRadius:'6px', padding:'6px 14px', fontSize:'13px', fontWeight:'600', cursor:'pointer' },
    inp: { width:'100%', padding:'10px 14px', border:'1px solid #e2e8f0', borderRadius:'8px', fontSize:'14px', boxSizing:'border-box', outline:'none', marginBottom:'10px' },
    sc: (n) => ({ display:'inline-block', background:n>=70?'#dcfce7':n>=50?'#fef9c3':'#fee2e2', color:n>=70?'#16a34a':n>=50?'#ca8a04':'#dc2626', borderRadius:'99px', padding:'4px 14px', fontSize:'13px', fontWeight:'700' }),
    tab: (a) => ({ background:aba===a?'#7c3aed':'white', color:aba===a?'white':'#475569', border:'1px solid #e2e8f0', borderRadius:'8px', padding:'10px 20px', fontSize:'14px', fontWeight:'600', cursor:'pointer' })
  }

  if (!auth) return (
    <div style={{...s.page,display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{background:'white',borderRadius:'16px',padding:'40px',maxWidth:'400px',width:'100%',boxShadow:'0 10px 30px rgba(0,0,0,.1)'}}>
        <h2 style={{fontSize:'20px',fontWeight:'700',marginBottom:'8px'}}>Painel G&C</h2>
        <p style={{color:'#64748b',marginBottom:'24px',fontSize:'14px'}}>Acesso restrito à equipe Curseduca</p>
        <input style={{...s.inp,padding:'12px 16px',fontSize:'16px',marginBottom:'16px'}} type="password" placeholder="Senha" value={senha} onChange={e=>setSenha(e.target.value)} onKeyDown={e=>e.key==='Enter'&&senha===SENHA_PAINEL&&setAuth(true)} />
        <button style={{...s.btn,width:'100%',padding:'12px'}} onClick={()=>senha===SENHA_PAINEL?setAuth(true):alert("Senha incorreta")}>Entrar</button>
        <button style={{...s.btnOut,width:'100%',marginTop:'12px',padding:'12px'}} onClick={onVoltar}>← Voltar</button>
      </div>
    </div>
  )

  const candFiltrados = candidatos
    .filter(c => vagaFiltro === "todas" || c.vagaId === vagaFiltro)
    .filter(c => filtro === "todos" || c.avaliacao?.classificacao?.includes(filtro==="avanca"?"Avança":filtro==="talvez"?"Talvez":"Não avança"))

  return (
    <div style={s.page}>
      <div style={s.inner}>
        {/* Header */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'24px'}}>
          <div>
            <h1 style={{fontSize:'22px',fontWeight:'700',color:'#0f172a',margin:0}}>Painel G&C</h1>
            <p style={{color:'#64748b',fontSize:'14px',marginTop:'4px'}}>{vagas.length} vaga(s) • {candidatos.length} candidato(s)</p>
          </div>
          <button style={s.btnOut} onClick={onVoltar}>← Voltar</button>
        </div>

        {/* Abas */}
        <div style={{display:'flex',gap:'8px',marginBottom:'24px'}}>
          <button style={s.tab("vagas")} onClick={()=>setAba("vagas")}>📋 Vagas</button>
          <button style={s.tab("candidatos")} onClick={()=>{ setAba("candidatos"); setCandidatosState(getCandidatos()) }}>👥 Candidatos</button>
        </div>

        {/* ── ABA VAGAS ── */}
        {aba === "vagas" && (
          <>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px'}}>
              <strong style={{fontSize:'15px',color:'#1e293b'}}>Vagas cadastradas</strong>
              <button style={s.btn} onClick={()=>setCriando(!criando)}>{criando ? "✕ Cancelar" : "+ Nova vaga"}</button>
            </div>

            {/* Formulário nova vaga */}
            {criando && (
              <div style={{...s.card,border:'2px solid #7c3aed',marginBottom:'24px'}}>
                <h3 style={{fontSize:'16px',fontWeight:'700',margin:'0 0 16px',color:'#1e293b'}}>Nova vaga</h3>
                <input style={s.inp} placeholder="Nome da vaga (ex: Analista de CS, SDR, Suporte N1...)" value={novaVaga.titulo} onChange={e=>setNovaVaga({...novaVaga,titulo:e.target.value})} />
                <p style={{fontSize:'13px',fontWeight:'600',color:'#475569',margin:'8px 0 12px'}}>Perguntas (mínimo 1, máximo 6):</p>
                {novaVaga.perguntas.map((p,i) => (
                  <input key={i} style={s.inp} placeholder={`Pergunta ${i+1}${i<2?' (obrigatória)':' (opcional)'}`} value={p} onChange={e=>atualizarPergunta(i,e.target.value)} />
                ))}
                {novaVaga.perguntas.length < 6 && (
                  <button style={{...s.btnOut,fontSize:'13px',padding:'6px 14px',marginBottom:'16px'}} onClick={()=>setNovaVaga({...novaVaga,perguntas:[...novaVaga.perguntas,""]})}>+ Adicionar pergunta</button>
                )}
                <div style={{display:'flex',gap:'8px',marginTop:'8px'}}>
                  <button style={s.btn} onClick={salvarVaga}>Salvar vaga</button>
                  <button style={s.btnOut} onClick={()=>setCriando(false)}>Cancelar</button>
                </div>
              </div>
            )}

            {vagas.length === 0 && !criando && (
              <div style={{...s.card,textAlign:'center',color:'#64748b',padding:'40px'}}>
                Nenhuma vaga cadastrada ainda. Clique em "+ Nova vaga" para começar.
              </div>
            )}

            {vagas.map(v => (
              <div key={v.id} style={s.card}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                  <div>
                    <strong style={{fontSize:'16px',color:'#1e293b'}}>{v.titulo}</strong>
                    <p style={{color:'#94a3b8',fontSize:'13px',margin:'4px 0 0'}}>{v.perguntas.length} pergunta(s) • criada em {v.criadaEm}</p>
                    <p style={{color:'#64748b',fontSize:'13px',margin:'4px 0 0'}}>{candidatos.filter(c=>c.vagaId===v.id).length} candidato(s) responderam</p>
                  </div>
                  <div style={{display:'flex',gap:'8px',flexShrink:0}}>
                    <button style={{...s.btnSm,background:linkCopiado===v.id?'#16a34a':'#7c3aed'}} onClick={()=>copiarLink(v.id)}>
                      {linkCopiado===v.id ? '✅ Copiado!' : '🔗 Copiar link'}
                    </button>
                    <button style={s.btnDel} onClick={()=>excluirVaga(v.id)}>Excluir</button>
                  </div>
                </div>
                <div style={{marginTop:'12px',background:'#f8fafc',borderRadius:'8px',padding:'12px'}}>
                  {v.perguntas.map((p,i) => <p key={i} style={{margin:'0 0 4px',fontSize:'13px',color:'#475569'}}><strong>P{i+1}:</strong> {p}</p>)}
                </div>
              </div>
            ))}
          </>
        )}

        {/* ── ABA CANDIDATOS ── */}
        {aba === "candidatos" && (
          <>
            {/* Filtros */}
            <div style={{display:'flex',gap:'8px',flexWrap:'wrap',marginBottom:'16px'}}>
              <select style={{...s.inp,width:'auto',marginBottom:0,padding:'8px 14px'}} value={vagaFiltro} onChange={e=>setVagaFiltro(e.target.value)}>
                <option value="todas">Todas as vagas</option>
                {vagas.map(v=><option key={v.id} value={v.id}>{v.titulo}</option>)}
              </select>
              {[["todos","Todos"],["avanca","✅ Avança"],["talvez","🟡 Talvez"],["nao","❌ Não avança"]].map(([v,l])=>(
                <button key={v} onClick={()=>setFiltro(v)} style={{...s.btn,background:filtro===v?'#7c3aed':'white',color:filtro===v?'white':'#475569',border:'1px solid #e2e8f0',padding:'8px 16px'}}>{l}</button>
              ))}
            </div>

            {candFiltrados.length===0 && <div style={{...s.card,textAlign:'center',color:'#64748b',padding:'40px'}}>Nenhum candidato encontrado.</div>}

            {candFiltrados.map((x,i)=>(
              <div key={i} style={{...s.card,cursor:'pointer'}} onClick={()=>setExp(exp===i?null:i)}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div>
                    <strong style={{fontSize:'16px'}}>{x.nome}</strong>
                    <span style={{marginLeft:'10px',background:'#ede9fe',color:'#7c3aed',borderRadius:'99px',padding:'2px 10px',fontSize:'12px',fontWeight:'600'}}>{x.vagaTitulo}</span>
                    <span style={{marginLeft:'8px',color:'#94a3b8',fontSize:'13px'}}>{x.data}</span>
                  </div>
                  <div style={{display:'flex',gap:'10px',alignItems:'center'}}>
                    <span style={s.sc(x.avaliacao?.score||0)}>{x.avaliacao?.score||'?'}/100</span>
                    <span style={{fontSize:'18px'}}>{x.avaliacao?.classificacao?.split(' ')[0]}</span>
                  </div>
                </div>
                {exp===i && (
                  <div style={{marginTop:'20px',borderTop:'1px solid #f1f5f9',paddingTop:'20px'}}>
                    <p style={{color:'#475569',fontSize:'14px',marginBottom:'16px'}}>{x.avaliacao?.resumo}</p>
                    {x.avaliacao?.pontos_fortes?.length>0&&<div style={{marginBottom:'12px'}}><strong style={{fontSize:'13px',color:'#16a34a'}}>✅ Pontos fortes</strong><ul style={{margin:'8px 0 0',paddingLeft:'20px'}}>{x.avaliacao.pontos_fortes.map((p,j)=><li key={j} style={{fontSize:'13px',color:'#475569'}}>{p}</li>)}</ul></div>}
                    {x.avaliacao?.alertas?.length>0&&<div style={{marginBottom:'16px'}}><strong style={{fontSize:'13px',color:'#dc2626'}}>⚠️ Alertas</strong><ul style={{margin:'8px 0 0',paddingLeft:'20px'}}>{x.avaliacao.alertas.map((a,j)=><li key={j} style={{fontSize:'13px',color:'#475569'}}>{a}</li>)}</ul></div>}
                    <strong style={{fontSize:'13px',color:'#475569'}}>Respostas</strong>
                    {x.respostas.map((r,j)=>(
                      <div key={j} style={{marginTop:'12px',background:'#f8fafc',borderRadius:'8px',padding:'12px'}}>
                        <p style={{margin:'0 0 6px',fontSize:'12px',color:'#94a3b8',fontWeight:'600'}}>P{j+1}</p>
                        <p style={{margin:0,fontSize:'14px',color:'#1e293b'}}>{r.texto}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}

// ── App Principal ───────────────────────────────────────────────────────────
export default function App() {
  const [tela, setTela] = useState("home")
  const [apiKey, setApiKey] = useState(localStorage.getItem("anthropic_key")||"")
  const [inputKey, setInputKey] = useState("")

  // Detecta ?vaga=ID na URL
  const vagaId = new URLSearchParams(window.location.search).get("vaga")

  const salvar = () => {
    if (!inputKey.trim()) return
    localStorage.setItem("anthropic_key", inputKey.trim())
    setApiKey(inputKey.trim()); setInputKey("")
    alert("API key salva!")
  }

  // Se URL tem ?vaga=ID, vai direto pra tela do candidato
  if (vagaId) return <TelaCandidato vagaId={vagaId} apiKey={apiKey} />
  if (tela==="painel") return <Painel onVoltar={()=>setTela("home")} apiKey={apiKey} />

  const s = {
    page: { minHeight:'100vh', background:'linear-gradient(135deg,#0f172a,#4c1d95)', display:'flex', alignItems:'center', justifyContent:'center', padding:'20px', fontFamily:'system-ui,sans-serif' },
    box: { background:'white', borderRadius:'20px', padding:'48px 40px', maxWidth:'480px', width:'100%', boxShadow:'0 30px 60px rgba(0,0,0,.4)', textAlign:'center' },
    btn: (bg) => ({ background:bg, color:'white', border:'none', borderRadius:'12px', padding:'16px 24px', fontSize:'16px', fontWeight:'600', cursor:'pointer', width:'100%', marginBottom:'12px', display:'block' }),
    kb: { background:'#f8fafc', borderRadius:'12px', padding:'20px', marginTop:'32px', textAlign:'left' },
    inp: { width:'100%', padding:'10px 14px', border:'1px solid #e2e8f0', borderRadius:'8px', fontSize:'14px', boxSizing:'border-box', marginBottom:'10px', outline:'none' }
  }

  return (
    <div style={s.page}>
      <div style={s.box}>
        <div style={{fontSize:'48px',marginBottom:'12px'}}>🎯</div>
        <h1 style={{fontSize:'26px',fontWeight:'800',color:'#0f172a',marginBottom:'8px'}}>Triagem Curseduca</h1>
        <p style={{color:'#64748b',marginBottom:'40px',fontSize:'15px'}}>Plataforma de triagem inteligente</p>
        <button style={s.btn('#1e293b')} onClick={()=>setTela("painel")}>🔒 Painel G&C</button>
        <div style={s.kb}>
          <p style={{margin:'0 0 10px',fontSize:'13px',color:'#475569',fontWeight:'600'}}>
            {apiKey ? "✅ API Key configurada" : "⚙️ Cole sua API Key da Anthropic (sk-ant-...)"}
          </p>
          <input style={s.inp} type="password" placeholder="sk-ant-..." value={inputKey} onChange={e=>setInputKey(e.target.value)} onKeyDown={e=>e.key==='Enter'&&salvar()} />
          <button onClick={salvar} style={{background:'#7c3aed',color:'white',border:'none',borderRadius:'8px',padding:'8px 16px',fontSize:'13px',cursor:'pointer',fontWeight:'600'}}>Salvar</button>
        </div>
      </div>
    </div>
  )
}
