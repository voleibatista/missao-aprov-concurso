import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiFetch } from '@/src/api/client';
import { colors, spacing, radius } from '@/src/theme/tokens';

export default function Enem() {
  const [data,setData]=useState<any>(null); const router=useRouter();
  useEffect(()=>{apiFetch('/enem').then(setData)},[]);
  if(!data) return <View style={s.center}><ActivityIndicator color={colors.brandPrimary}/></View>;
  return <ScrollView style={s.container} contentContainerStyle={s.content}>
    <Pressable onPress={()=>router.back()}><Ionicons name="arrow-back" size={24} color={colors.onSurface}/></Pressable>
    <Text style={s.h1}>ENEM</Text><Text style={s.sub}>Prepare-se por área do conhecimento</Text>
    {data.areas.map((a:any)=><Pressable key={a.id} style={s.card} onPress={()=>router.push({pathname:'/(tabs)/questoes',params:{disciplina:a.id}})}>
      <Ionicons name="school" size={24} color={a.cor||colors.brandPrimary}/><View style={{flex:1}}><Text style={s.title}>{a.nome}</Text><Text style={s.small}>{data.questoes_por_area[a.id]||0} questões disponíveis</Text></View><Ionicons name="chevron-forward" size={20} color={colors.info}/>
    </Pressable>)}
    <Pressable style={s.primary} onPress={()=>router.push({pathname:'/simulado',params:{concurso_id:'enem-2026'}})}><Text style={s.primaryText}>Fazer simulado ENEM</Text></Pressable>
  </ScrollView>
}
const s=StyleSheet.create({container:{flex:1,backgroundColor:colors.surface},content:{padding:spacing.xl,paddingTop:55,paddingBottom:60},center:{flex:1,alignItems:'center',justifyContent:'center'},h1:{fontSize:30,fontWeight:'800',marginTop:20,color:colors.onSurface},sub:{color:colors.onSurfaceTertiary,marginBottom:20},card:{flexDirection:'row',gap:12,alignItems:'center',padding:16,borderWidth:1,borderColor:colors.border,borderRadius:radius.md,backgroundColor:colors.surfaceSecondary,marginBottom:10},title:{fontWeight:'700',color:colors.onSurface},small:{fontSize:12,color:colors.onSurfaceTertiary,marginTop:3},primary:{backgroundColor:colors.brandPrimary,padding:16,borderRadius:radius.md,alignItems:'center',marginTop:12},primaryText:{color:'#fff',fontWeight:'800'}})
