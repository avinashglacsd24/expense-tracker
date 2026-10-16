import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import axios from 'axios';
import { Plus, Trash2, Pencil, LogOut, Wallet, Search } from 'lucide-react';
import './style.css';

const api = axios.create({ baseURL: 'http://localhost:5000/api' });
const categories = ['Food','Transport','Shopping','Bills','Entertainment','Education','Health','Other'];

function App() {
  const [token,setToken]=useState(localStorage.getItem('token'));
  const [user,setUser]=useState(JSON.parse(localStorage.getItem('user')||'null'));
  const [expenses,setExpenses]=useState([]);
  const [budget,setBudget]=useState(0);
  const [query,setQuery]=useState('');
  const [editing,setEditing]=useState(null);
  const [form,setForm]=useState({title:'',amount:'',category:'Food',expense_date:new Date().toISOString().slice(0,10),note:''});
  const [authMode,setAuthMode]=useState('login');
  const [authForm,setAuthForm]=useState({name:'',email:'',password:''});
  const [error,setError]=useState('');

  useEffect(()=>{ if(token) load(); },[token]);
  async function load(){
    try {
      api.defaults.headers.common.Authorization=`Bearer ${token}`;
      const [e,b]=await Promise.all([api.get('/expenses'),api.get('/budget')]);
      setExpenses(e.data); setBudget(Number(b.data.monthly_budget));
    } catch { logout(); }
  }
  function logout(){localStorage.clear();setToken(null);setUser(null);}
  async function submitAuth(e){
    e.preventDefault(); setError('');
    try {
      const url=authMode==='login'?'/auth/login':'/auth/register';
      const r=await api.post(url,authForm);
      localStorage.setItem('token',r.data.token); localStorage.setItem('user',JSON.stringify(r.data.user));
      setToken(r.data.token);setUser(r.data.user);
    } catch(err){setError(err.response?.data?.message||'Request failed');}
  }
  async function saveExpense(e){
    e.preventDefault();
    try {
      if(editing) await api.put(`/expenses/${editing}`,form);
      else await api.post('/expenses',form);
      setEditing(null); setForm({title:'',amount:'',category:'Food',expense_date:new Date().toISOString().slice(0,10),note:''});
      load();
    } catch(err){setError(err.response?.data?.message||'Could not save expense');}
  }
  async function remove(id){ if(confirm('Delete this expense?')) { await api.delete(`/expenses/${id}`); load(); } }
  function edit(x){setEditing(x.id);setForm({...x,amount:String(x.amount),expense_date:String(x.expense_date).slice(0,10),note:x.note||''});window.scrollTo({top:0,behavior:'smooth'});}
  async function saveBudget(){
    await api.put('/budget',{monthly_budget:budget}); load();
  }

  if(!token) return <Auth mode={authMode} setMode={setAuthMode} form={authForm} setForm={setAuthForm} submit={submitAuth} error={error}/>;

  const filtered=expenses.filter(x => `${x.title} ${x.category} ${x.note||''}`.toLowerCase().includes(query.toLowerCase()));
  const total=expenses.reduce((s,x)=>s+Number(x.amount),0);
  const month=new Date().toISOString().slice(0,7);
  const monthly=expenses.filter(x=>String(x.expense_date).slice(0,7)===month).reduce((s,x)=>s+Number(x.amount),0);
  const remaining=Math.max(0,budget-monthly);

  return <div className="app">
    <header><div className="brand"><Wallet/> Expense Tracker</div><div className="user">Hi, {user?.name} <button onClick={logout}><LogOut size={16}/> Logout</button></div></header>
    <main>
      <section className="stats">
        <div><span>Total expenses</span><strong>₹{total.toFixed(2)}</strong></div>
        <div><span>This month</span><strong>₹{monthly.toFixed(2)}</strong></div>
        <div><span>Monthly budget</span><strong>₹{Number(budget).toFixed(2)}</strong></div>
        <div><span>Remaining</span><strong>₹{remaining.toFixed(2)}</strong></div>
      </section>

      <section className="card">
        <h2>{editing?'Edit expense':'Add expense'}</h2>
        <form className="expense-form" onSubmit={saveExpense}>
          <input required placeholder="Expense title" value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/>
          <input required type="number" min="0.01" step="0.01" placeholder="Amount" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})}/>
          <select value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>{categories.map(c=><option key={c}>{c}</option>)}</select>
          <input required type="date" value={form.expense_date} onChange={e=>setForm({...form,expense_date:e.target.value})}/>
          <input placeholder="Note (optional)" value={form.note} onChange={e=>setForm({...form,note:e.target.value})}/>
          <button className="primary"><Plus size={17}/>{editing?'Update':'Add'} expense</button>
          {editing && <button type="button" onClick={()=>setEditing(null)}>Cancel</button>}
        </form>
      </section>

      <section className="toolbar">
        <div className="search"><Search size={18}/><input placeholder="Search expenses..." value={query} onChange={e=>setQuery(e.target.value)}/></div>
        <div className="budget"><label>Monthly budget ₹</label><input type="number" value={budget} onChange={e=>setBudget(e.target.value)}/><button onClick={saveBudget}>Save</button></div>
      </section>

      <section className="card">
        <h2>Expense history</h2>
        <div className="table-wrap"><table><thead><tr><th>Title</th><th>Category</th><th>Date</th><th>Amount</th><th>Actions</th></tr></thead>
        <tbody>{filtered.map(x=><tr key={x.id}><td><b>{x.title}</b><small>{x.note}</small></td><td><span className="tag">{x.category}</span></td><td>{String(x.expense_date).slice(0,10)}</td><td>₹{Number(x.amount).toFixed(2)}</td><td><button onClick={()=>edit(x)}><Pencil size={16}/></button><button onClick={()=>remove(x.id)}><Trash2 size={16}/></button></td></tr>)}</tbody></table>
        {!filtered.length && <p className="empty">No expenses found.</p>}</div>
      </section>
    </main>
  </div>
}

function Auth({mode,setMode,form,setForm,submit,error}){
 return <div className="auth"><div className="auth-card"><Wallet size={38}/><h1>Expense Tracker</h1><p>{mode==='login'?'Sign in to continue':'Create your account'}</p>
 <form onSubmit={submit}>{mode==='register'&&<input required placeholder="Name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/>}<input required type="email" placeholder="Email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/><input required minLength="6" type="password" placeholder="Password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/>{error&&<div className="error">{error}</div>}<button className="primary">{mode==='login'?'Login':'Register'}</button></form>
 <button className="switch" onClick={()=>setMode(mode==='login'?'register':'login')}>{mode==='login'?'Create account':'Already have an account? Login'}</button>
 </div></div>
}
createRoot(document.getElementById('root')).render(<App/>);