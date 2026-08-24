import { NextResponse } from 'next/server'
import { getProxies } from '@/lib/proxies'
export async function GET(){return NextResponse.json({proxies:getProxies()})}