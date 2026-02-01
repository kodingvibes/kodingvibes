'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { ArrowBigUp, ArrowBigDown } from 'lucide-react'

interface VoteButtonsProps {
  postId: string
  initialVotes: number
}

export default function VoteButtons({ postId, initialVotes }: VoteButtonsProps) {
  const [votes, setVotes] = useState(initialVotes)
  const [userVote, setUserVote] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const getUserVote = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('votes')
        .select('value')
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .single()

      if (data) {
        setUserVote(data.value)
      }
    }
    getUserVote()
  }, [postId])

  const handleVote = async (value: number) => {
    setLoading(true)
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert('Debes iniciar sesión para votar')
        return
      }

      if (userVote === value) {
        await supabase
          .from('votes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id)
        setUserVote(null)
        setVotes(votes - value)
      } else {
        await supabase
          .from('votes')
          .upsert({
            post_id: postId,
            user_id: user.id,
            value: value,
          }, {
            onConflict: 'user_id,post_id'
          })
        
        const voteDiff = userVote ? value - userVote : value
        setUserVote(value)
        setVotes(votes + voteDiff)
      }
    } catch (error) {
      console.error('Error voting:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        onClick={() => handleVote(1)}
        disabled={loading}
        className={`p-1.5 rounded-lg transition-all ${
          userVote === 1 
            ? 'text-indigo-600 bg-indigo-100 dark:bg-indigo-900/30' 
            : 'text-muted-foreground hover:bg-muted'
        }`}
      >
        <ArrowBigUp className="h-6 w-6" />
      </button>
      
      <span className={`text-sm font-bold min-w-[2rem] text-center ${
        userVote === 1 ? 'text-indigo-600' : userVote === -1 ? 'text-rose-600' : ''
      }`}>
        {votes}
      </span>
      
      <button
        onClick={() => handleVote(-1)}
        disabled={loading}
        className={`p-1.5 rounded-lg transition-all ${
          userVote === -1 
            ? 'text-rose-600 bg-rose-100 dark:bg-rose-900/30' 
            : 'text-muted-foreground hover:bg-muted'
        }`}
      >
        <ArrowBigDown className="h-6 w-6" />
      </button>
    </div>
  )
}
