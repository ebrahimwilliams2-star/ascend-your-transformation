       <header className="sticky top-0 z-40 flex items-center justify-between p-6 backdrop-blur-md bg-brand-black/80">
         <div>
           <p className="chip-label text-brand-red">{profile.goal_type.toUpperCase()} · {target.toLocaleString()} KCAL</p>
           <h1 className="text-display text-2xl font-bold mt-0.5">Nutrition</h1>
         </div>
         <div className="relative z-50">
           <button 
             onClick={() => setShowResetMenu(!showResetMenu)} 
             className="flex items-center gap-1.5 rounded-lg bg-brand-red/20 px-3 py-2 text-sm font-bold text-brand-red hover:bg-brand-red/30 transition-colors"
           >
             <RotateCcw className="size-4" />
             <span>Reset</span>
           </button>
           {showResetMenu && (
             <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-white/10 bg-brand-black/95 backdrop-blur-md shadow-lg overflow-hidden">
               <button
                 onClick={() => resetTodayLogs.mutate()}
                 disabled={resetTodayLogs.isPending}
                 className="w-full text-left px-4 py-3 text-sm font-medium text-brand-silver hover:text-white hover:bg-brand-gray/40 transition-colors disabled:opacity-50"
               >
                 {resetTodayLogs.isPending ? "Clearing…" : "Clear Today's Logs"}
               </button>
               <div className="border-t border-white/5" />
               <button
                 onClick={() => resetNutritionPlan.mutate()}
                 disabled={resetNutritionPlan.isPending}
                 className="w-full text-left px-4 py-3 text-sm font-medium text-brand-red hover:bg-brand-red/10 transition-colors disabled:opacity-50"
               >
                 {resetNutritionPlan.isPending ? "Resetting…" : "Reset Nutrition Plan"}
               </button>
             </div>
           )}
         </div>
       </header>