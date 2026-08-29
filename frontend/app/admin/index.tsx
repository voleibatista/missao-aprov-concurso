import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiFetch } from '@/src/api/client';
import { colors, spacing, radius } from '@/src/theme/tokens';

export default function Admin(){
 const [users,setUsers]=useState<any[]|null>(null);const router=useRouter();
 const load=()=>apiFetch('/admin/users').then(d=>setUsers(d.users));
 useEffect(()=>{load()},[]);
 const toggle=async(u:any)=>{await apiFetch(`/admin/users/${u.user_id}/${u.blocked?'unblock':'block'}`,{method:'POST'});load()};
 return <ScrollView style={s.container} contentContainerStyle={s.content}><Pressable onPress={()=>router.back()}><Ionicons name="arrow-back" size={24}/></Pressable><Text style={s.h1}>Administração</Text><Text style={s.sub}>Usuários e bloqueios</Text>
 {users===null?<ActivityIndicator color={colors.brandPrimary}/>:users.map(u=><View key={u.user_id} style={s.card}><View style={{flex:1}}><Text style={s.title}>{u.name}</Text><Text style={s.small}>{u.email} • {u.is_admin?'Administrador':'Usuário'}</Text></View><Pressable onPress={()=>toggle(u)} style={[s.action,u.blocked&&s.unblock]}><Text style={s.actionText}>{u.blocked?'Desbloquear':'Bloquear'}</Text></Pressable></View>)}
 </ScrollView>
}
const s=StyleSheet.create({container:{flex:1,backgroundColor:colors.surface},content:{padding:spacing.xl,paddingTop:55,paddingBottom:60},h1:{fontSize:28,fontWeight:'800',color:colors.onSurface,marginTop:20},sub:{color:colors.onSurfaceTertiary,marginBottom:20},card:{flexDirection:'row',alignItems:'center',gap:10,padding:14,borderWidth:1,borderColor:colors.border,borderRadius:radius.md,marginBottom:9,backgroundColor:colors.surfaceSecondary},title:{fontWeight:'700',color:colors.onSurface},small:{fontSize:11,color:colors.onSurfaceTertiary},action:{backgroundColor:colors.error,padding:9,borderRadius:8},unblock:{backgroundColor:colors.brandPrimary},actionText:{color:'#fff',fontWeight:'700',fontSize:11}})
