import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiFetch } from '@/src/api/client';
import { colors, spacing, radius } from '@/src/theme/tokens';

export default function Page() {
 const [items,setItems]=useState<any[]|null>(null); const router=useRouter();
 useEffect(()=>{apiFetch('/caderno-erros').then(d=>setItems(d.questoes||d.ranking||[]))},[]);
 return <ScrollView style={s.container} contentContainerStyle={s.content}>
  <Pressable onPress={()=>router.back()}><Ionicons name="arrow-back" size={24} color={colors.onSurface}/></Pressable>
  <Text style={s.h1}>Caderno de erros</Text>
  {items===null?<ActivityIndicator color={colors.brandPrimary}/>:items.length===0?<Text style={s.empty}>Nenhum item por enquanto.</Text>:items.map((q:any,i:number)=><View key={q.id||q.user_id||i} style={s.card}><Ionicons name="refresh-circle" size={22} color={colors.brandPrimary}/><View style={{flex:1}}><Text style={s.title}>{q.enunciado||`${q.posicao}º  ${q.name}`}</Text><Text style={s.small}>{q.assunto||q.disciplina||`${q.xp} XP • ${q.streak} dias`}</Text></View></View>)}
 </ScrollView>
}
const s=StyleSheet.create({container:{flex:1,backgroundColor:colors.surface},content:{padding:spacing.xl,paddingTop:55,paddingBottom:60},h1:{fontSize:28,fontWeight:'800',color:colors.onSurface,marginVertical:20},card:{flexDirection:'row',gap:12,padding:15,borderWidth:1,borderColor:colors.border,borderRadius:radius.md,backgroundColor:colors.surfaceSecondary,marginBottom:10},title:{fontWeight:'700',color:colors.onSurface,flexShrink:1},small:{fontSize:12,color:colors.onSurfaceTertiary,marginTop:4},empty:{color:colors.onSurfaceTertiary}})
