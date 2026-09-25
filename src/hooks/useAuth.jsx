import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import { getBusinessProfile } from '../features/businessProfile/api'
const AuthContext = createContext(null)
export function AuthProvider({children}) {
 const [session,setSession]=useState(null), [business,setBusiness]=useState(null), [loading,setLoading]=useState(true), [authError,setAuthError]=useState(null);
 const generation=useRef(0);
 const load=useCallback(async (next)=>{const token=++generation.current;setSession(next);setBusiness(null);setLoading(true);setAuthError(null);try{const profile=next?.user ? await getBusinessProfile(next.user.id):null;if(token===generation.current)setBusiness(profile);}catch{if(token===generation.current)setAuthError('Could not load your business. Please retry.');}finally{if(token===generation.current)setLoading(false);}},[]);
 useEffect(()=>{
  localStorage.removeItem('energize_u_demo_session');
  if(!isSupabaseConfigured){setLoading(false);return;}
  let active=true;
  supabase.auth.getSession().then(({data,error})=>{if(active){if(error){setAuthError('Could not restore your session. Please sign in again.');setLoading(false);}else load(data.session);}});
  const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,next)=>{setTimeout(()=>{if(active)load(next);},0);});
  return()=>{active=false;++generation.current;subscription.unsubscribe();};
 },[load]);
 const refreshBusiness=useCallback(async()=>{if(!session?.user)return null;const profile=await getBusinessProfile(session.user.id);setBusiness(profile);setAuthError(null);return profile;},[session]);
 const signInWithGoogle=async()=>{if(!isSupabaseConfigured)throw Error('Supabase is not configured.');const {data,error}=await supabase.auth.signInWithOAuth({provider:'google',options:{redirectTo:window.location.origin+'/'}});if(error)throw error;return data;};
 const signInWithIdToken=async(token)=>{const {data,error}=await supabase.auth.signInWithIdToken({provider:'google',token});if(error)throw error;await load(data.session);return data;};
 const signInWithDemo=async()=>{throw Error('Sign in to save your business. Bill extraction demos are available during setup.');};
 const signOut=async()=>{const {error}=await supabase.auth.signOut();if(error)throw error;await load(null);};
 return <AuthContext.Provider value={{user:session?.user||null,session,business,loading,authError,isConfigured:isSupabaseConfigured,refreshBusiness,signInWithGoogle,signInWithIdToken,signInWithDemo,signOut,clearAuthError:()=>setAuthError(null)}}>{children}</AuthContext.Provider>;
}
export function useAuth(){return useContext(AuthContext)}
