import { NextRequest, NextResponse } from 'next/server'
export const dynamic='force-dynamic'
export async function POST(req:NextRequest){const {urls}=await req.json(); if(!urls?.length) return NextResponse.json({error:'No URLs'},{status:400}); console.log('Google',urls); return NextResponse.json({success:true,provider:'google',count:urls.length})}