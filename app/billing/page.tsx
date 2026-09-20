import {createClient} from "@/lib/supabase/server"
import {redirect} from "next/navigation"
import BillingClient from "@/components/billing/billing-client"
export const dynamic="force-dynamic"
export default async function BillingPage(){const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)redirect("/");return <BillingClient/>}