import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from '@/src/theme/tokens';
export default function Pomodoro(){const router=useRouter();const [secs,setSecs]=useState(25*60);const [run,setRun]=useState(false);
useEffect(()=>{if(!run)return;const id=setInterval(()=>setSecs(v=>v>0?v-1:0),1000);return()=>clearInterval(id)},[run]);
const reset=(m:number)=>{setRun(false);setSecs(m*60)}; const mm=String(Math.floor(secs/60)).padStart(2,'0'),ss=String(secs%60).padStart(2,'0');
return <View style={s.c}><Pressable style={s.back} onPress={()=>router.back()}><Ionicons name="arrow-back" size={24}/></Pressable><Text style={s.h}>Pomodoro</Text><Text style={s.time}>{mm}:{ss}</Text><Pressable style={s.btn} onPress={()=>setRun(!run)}><Text style={s.bt}>{run?'Pausar':'Iniciar'}</Text></Pressable><View style={s.row}><Pressable style={s.alt} onPress={()=>reset(25)}><Text>25 min</Text></Pressable><Pressable style={s.alt} onPress={()=>reset(5)}><Text>Pausa 5 min</Text></Pressable></View></View>}
const s=StyleSheet.create({c:{flex:1,backgroundColor:colors.surface,alignItems:'center',justifyContent:'center',padding:spacing.xl},back:{position:'absolute',top:55,left:24},h:{fontSize:28,fontWeight:'800',color:colors.onSurface},time:{fontSize:64,fontWeight:'800',marginVertical:35,color:colors.brandPrimary},btn:{backgroundColor:colors.brandPrimary,paddingVertical:15,paddingHorizontal:55,borderRadius:radius.md},bt:{color:'#fff',fontWeight:'800'},row:{flexDirection:'row',gap:10,marginTop:20},alt:{padding:12,borderWidth:1,borderColor:colors.border,borderRadius:radius.md}})
