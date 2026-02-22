import { HardHat, Layout, Moon, PlusCircle, Sun } from 'lucide-react'
import  {useTheme}  from '@/context/ThemeContext'
 interface NavBarProps {
        view: 'new' | 'generating' | 'result';
        dispatch: React.Dispatch<any>;
    }
const NavBar = (  { view, dispatch }: NavBarProps ) => {
    const { darkMode, toggleDarkMode } = useTheme();
   
  return (
    <nav className='bg-white/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 sticky z-50 backdrop-blur-md transition-colors duration-300'>
          <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between'>
            <div className='flex items-center space-x-3 cursor-pointer'
            onClick={() => dispatch({ type: 'newEstimation' })}
            >
              <div className='bg-indigo-600 p-2 rounded-lg shadow-md shadow-indigo-200 dark:shadow-none'>
                <HardHat className='w-6 h-6 text-white' />
              </div>
              <div>
                <h1 className='text-xl font-bold tracking-tight text-slate-900 dark:text-white'>QS-Bot</h1>
                <p className='text-sm text-slate-500 dark:text-slate-400'>Gemini AI Quantity Surveyor</p>
              </div>
            </div>
            <div className='flex items-center space-x-4'>
              {view === 'result' && (
                <button
                 onClick={() => dispatch({ type: 'newEstimation' })}
                  className='flex items-center gap-1.5 text-xs font-bold bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-300 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-900 transition-all shadow-sm shadow-slate-200 dark:shadow-slate-800'>
                    <PlusCircle className='w-4 h-4' />
                    New Estimation
                </button>
              )}
              <button
              onClick={toggleDarkMode}
              className='p-2 rounded-full bg-slat-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors'>
                  {darkMode ? <Sun className='w-4 h-4' /> : <Moon className='w-4 h-4' />}
              </button>
              <span className='hidden md:flex items-center text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1.5 rounded-full text-xs font-bold border border-indigo-100 dark:border-indigo-800'>
              <Layout className='w-3 h-3 mr-1.5'/>
              v0.1.0 Beta
              </span>
            </div>
          </div>
        </nav>
  )
}

export default NavBar
