import {  useReducer, useState } from 'react'
import './App.css'
import NavBar from '@components/NavBar'
import { ThemeProvider } from '@/context/ThemeContext'
import InputSection from './components/InputSection';
import { AlertOctagonIcon, Clock } from 'lucide-react';
import { type CountryOption, MeasurementStandard, type BOQResponse } from '@/util/types'
import { generateBOQ } from '@/api/BOQApi'
import BOQDisplay from './components/BOQDisplay';

function App() {
  type viewState = 'new' | 'generating' | 'result';
  const [error, setError] = useState<string | null>(null);


  interface AppState {
    view: viewState;
  }

  type AppAction =
    | { type: 'startGeneration' }
    | { type: 'finishGeneration' }
    | { type: 'newEstimation' }

  function appReducer(state: AppState, action: AppAction): AppState {
    switch (action.type) {
      case 'startGeneration':
        return { ...state, view: 'generating' };
      case 'finishGeneration':
        return { ...state, view: 'result' };
      case 'newEstimation':
        return { view: 'new' };
      default:
        return state;
    }
  }

  const [state, dispatch] = useReducer(appReducer, { view: 'new' });
  const [data, setData] = useState<BOQResponse | null>(null);
  const handleGenerate = async (
    description: string,
    mesurementStandard: MeasurementStandard,
    coutntry: CountryOption,
    file?: { mimeType: string, data: string }
  ) => {
    setError(null);
    dispatch({ type: 'startGeneration' });
    setData(null);
    try {
      const result = await generateBOQ(description, mesurementStandard, coutntry, file);
      setData(result);
      dispatch({ type: 'finishGeneration' })
    } catch (err: any) {
      console.error(err);
      const msg = err.message || "An unexpected error occurred while contacting the AI service.";
      setError(msg.replace("GoogleGenAIError:", "").trim());
      dispatch({type: 'newEstimation' })
    }
};
  return (
    <>
      <ThemeProvider>
        <div className='min-h-screen font-sans pb-20 selection:bg-indigo-200 selcetion:text-indigo-900 dark:selection:bg-indigo-900 dark:selection:text-indigo-100 transition-colors duration-300'>

          <NavBar view={state.view} dispatch={dispatch} />

          <main className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10'>
            {state.view === 'new' && (
              <div className='animate-fade-in mb-10'>
                <div className='text-center mb-12'>
                  <h2 className='text-3xl md:text-5xl font-extrabold text-slate-900 dark:text-white mb-6 tracking-tight'>
                    Draft BOQs , <span className='text-transparent bg-clip-text bg-linear-to-r from-indigo-600 to-blue-500 dark:from-indigo-400 dark:to-blue-400'>Instantly</span>.
                  </h2>
                  <p className='text-lg text-slate-500 dark:text-slate-400'>  AI estimation with automated rate analysis, vendor recommendations, and detailed quantity take-offs.</p>
                </div>
                {/* Placeholder for new estimation form */}
                <InputSection onGenerate={handleGenerate} isLoading={false} />
              </div>
            )}
            {/* Loading State */}
            {state.view === 'generating' && (

              <div className='text-center py-20 animate-fade-in'>
                <div className='animate-spin w-12 h-12 border-4 border-indigo-500 dark:border-indigo-950 border-t-transparent rounded-full mx-auto mb-6'></div>
                <h3 className='text-xl font-bold text-slate-800 dark:text-slate-100 mb-2'>Generating Esitmation....</h3>
                <p className='text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-8'>
                  Analyzing scope, calculating quantities, sourcing vendor rates, and compiling your BOQ. This may take a moment.
                </p>
              </div>

            )}
            {/* error message */}
            {error && (
              <div className='mb-10 animate-fade-in'>
                <div className={`border rounded-2xl p-6 md:p-8 flex items-center gap-6 shadow-sm ${error.includes('Quota') ? 'bg-amber-50 dark:bg-amber-800 border-amber-200 dark:border-amber-900/50' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900/50'}`}>
                  <div className={`p-3 rounded-full shadow-sm border ${error.includes('Quota') ? 'bg-white dark:bg-amber-800 border-amber-200 dark:border-amber-900 text-amber-600 dark:text-amber-400' : 'bg-white dark:bg-red-900/30 border-red-100 dark:border-red-900 transition-colors text-red-600 dark:text-red-400'
                    }`}>
                    {error.includes('Quota') ? <Clock className=' w-8 h-8' /> : <AlertOctagonIcon className=' w-8 h-8' />}
                  </div>
                  <div>
                    <h3 className={`text-lg font-bold ${error.includes('Quota') ? 'text-amber-900 dark:text-amber-200' : 'text-red-900 dark:text-red-200'}`}>
                      {error.includes('Quota') ? 'API Quota Exceeded' : 'Generation Failed' }
                   
                    </h3>
                    <p className={`${error.includes('Quota') ? 'text-amber-700 dark:text-amber-200' : 'text-red-700 dark:text-red-200'}`}>
                      {error.replace(/\*\*|⚠️/g, '')}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* result area */}
            { state.view === 'result'&& data && (
              <BOQDisplay data={data} />
              
            )}
{}

          </main>

        </div>
      </ThemeProvider>
    </>
    
  )
}

export default App
