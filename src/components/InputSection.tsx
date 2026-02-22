import React, { useState, useRef } from 'react'
import { ArrowRight, FileText, FileType, Globe, Ruler, SparklesIcon, UploadCloudIcon, X } from 'lucide-react'
import { type CountryOption, MeasurementStandard } from '@/util/types'
import { Mesurement_Standards, COUNTRIES, sampleProjectDescription } from '@/util/constents';
interface InputSectionProps {
    onGenerate: (description: string, standerd: MeasurementStandard, country: CountryOption, file?: { mimeType: string; data: string }) => void;
    isLoading: boolean;
}
function InputSection({ onGenerate, isLoading }: InputSectionProps) {
    const [description, setDescription] = useState('');
    const [measurementStandard, setMeasurementStandard] = useState<MeasurementStandard>(Mesurement_Standards[0]);
    const [countryCode, setCountryCode] = useState<string>(COUNTRIES[0].code);

    // file state
    const [slectedFile, setSelectedFile] = useState<File | null>(null);
    const [filePreview, setFilePreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleGenerate = async () => {
        if (!description.trim() && !slectedFile) return;
        const selectedCountry = COUNTRIES.find(c => c.code === countryCode) || COUNTRIES[0];

        let fileData = undefined;

        if (slectedFile) {
            try {
                const base64Data = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.readAsDataURL(slectedFile);
                    reader.onload = () => {
                        const result = reader.result as string;
                        const parts = result.split(',');
                        const base64 = parts.length > 1 ? parts[1] : parts[0];
                        resolve(base64);
                    }
                    reader.onerror = error => reject(error);
                });
                fileData = {
                    mimeType: slectedFile.type,
                    data: base64Data
                }
            } catch (error) {
                console.error('Error reading file:', error);
                alert('Failed to read the file. Please try again.');
                return;
            }
        }
        onGenerate(description, measurementStandard, selectedCountry, fileData);

    };

    const handleLoadSample = () => {
        setDescription(sampleProjectDescription);
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (file.size > 5 * 1024 * 1024) {
                alert('File size exceeds 5MB limit. Please choose a smaller file.');
                return;
            }
            setSelectedFile(file);

            if (file.type.startsWith('image/')) {
                setFilePreview(URL.createObjectURL(file));
            }
            else {
                setFilePreview(null);
            }
        }
    };

    const clearFile = () => {
        if (filePreview) URL.revokeObjectURL(filePreview);
        setSelectedFile(null);
        setFilePreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <div className='bg-white dark:bg-slate-800 rounded-2xl shadow-xl shadow-slate-200 dark:shadow-slate-900/20 border border-slate-100 dark:border-slate-700 p-8 mb-10 transition-all duration-300 hover:shadow-2xl hover:shadow-slate-200/60 dark:hover:shadow-slate-900/40'>
            <div className='flex justify-between items-center mb-6'>
                <h3 className='text-xl font-bold text-slate-800 dark:text-slate-100'>Project Configuration</h3>
                <span className='text-xs font-medium bg-indigo-50 dark:bg-indigo-900/30 rounded-full px-3 py-1 text-indigo-700 dark:text-indigo-300 bodrer border-indigo-100 dark:border-indigo-900'>Powerd by Google Gemini</span>
            </div>

            <div className='grid grid-cols-1 md:grid-cols-2 gap-8 mb-8'>
                {/* measurement */}
                <div className='space-y-3'>
                    <label className="flex items-center text-sm font-semibold text-slate-700 dark:text-slate-300">
                        <span className='p-1.5 bg-indigo-200 dark:bg-indigo-900/50 rounded-md mr-2 text-indigo-700 dark:text-indigo-200'>
                            <Ruler className='w-4 h-4' />
                        </span>
                        Measurement Standard
                    </label>
                    <div className='relative'>
                        <select
                            value={measurementStandard}
                            onChange={(e) => setMeasurementStandard(e.target.value as MeasurementStandard)}
                            className='w-full appearance-none bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md py-2 pl-3 pr-8 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500'>
                            {Mesurement_Standards.map((standard) => (
                                <option key={standard} value={standard} className='bg-white dark:bg-slate-800'>
                                    {standard}
                                </option>
                            ))}
                        </select>
                        <div className='pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2'>
                            <svg className='h-4 w-4 text-slate-400' xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='currentColor'>
                                <path fillRule='evenodd' d='M5.23 7.21a.75.75 0 011.06.02L10 11.584l3.71-4.354a.75.75 0 111.14.976l-4.25 5a.75.75 0 01-1.14 0l-4.25-5a.75.75 0 01.02-1.06z' clipRule='evenodd' />
                            </svg>
                        </div>
                    </div>
                </div>

                {/* country selectoin */}
                <div className='space-y-3'>
                    <label className="flex items-center text-sm font-semibold text-slate-700 dark:text-slate-300">
                        <span className='p-1.5 bg-indigo-200 dark:bg-indigo-900/50 rounded-md mr-2 text-indigo-700 dark:text-indigo-200'>
                            <Globe className='w-4 h-4' />
                        </span>
                        Location & Currency
                    </label>
                    <div className='relative'>
                        <select
                            value={countryCode}
                            onChange={(e) => setCountryCode(e.target.value as string)}
                            className='w-full appearance-none bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md py-2 pl-3 pr-8 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500'>
                            {COUNTRIES.map((country) => (
                                <option key={country.code} value={country.code} className='bg-white dark:bg-slate-800'>
                                    {country.name} - {country.currency}
                                </option>
                            ))}
                        </select>
                        <div className='pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2'>
                            <svg className='h-4 w-4 text-slate-400' xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='currentColor'>
                                <path fillRule='evenodd' d='M5.23 7.21a.75.75 0 011.06.02L10 11.584l3.71-4.354a.75.75 0 111.14.976l-4.25 5a.75.75 0 01-1.14 0l-4.25-5a.75.75 0 01.02-1.06z' clipRule='evenodd' />
                            </svg>
                        </div>
                    </div>
                </div>
            </div>

            {/* Scope Input (file or text) */}
            <div className='space-y-3 mb-8'>
                <div className='flex justify-between items-center'>
                    <label className='flex items-center text-sm font-semibold text-slate-700 dark:text-slate-200'>
                        <span className='p-1.5 bg-indigo-200 dark:bg-indigo-900/50 rounded-md mr-2 text-indigo-700 dark:text-indigo-200'>
                            <FileText className='w-4 h-4' />
                        </span>
                        Scope of Work
                    </label>
                    <div className='flex gap-2'>
                        <button
                            onClick={handleLoadSample}
                            className='group flex items-center text-xs font-semibold text-indigo-600 dark:text-indigo-200 hover:text-indigo-900 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 px-3 py-1.5 rounded-lg tracking-tight transition-all border border-transparent hover:border-indigo-300 dark:hover:border-indigo-700'
                            title='Populate with example text'
                        >
                            <SparklesIcon className=' w-3 h-3 mr-1.5 group-hover:text-amber-500 transition-colors' />
                            Load Sample Data
                        </button>
                    </div>
                </div>
                {/* upload zone */}
                {
                    !slectedFile ? (
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className='flex flex-col items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-md py-10 cursor-pointer hover:border-indigo-500 transition-colors'>
                            <span className='text-slate-500 dark:text-slate-400'><UploadCloudIcon className='w-5 h-5 text-indigo-700' /></span>
                            <h4 className='text-slate-900 dark:text-slate-100 mb-1 font-semibold'> Upload Drawing or Scope</h4>
                            <p className=' text-xss text-slate-500 dark:text-slate-300 md-4'>Supported formats: PDF, PNG, JPG</p>
                            <div className='text-xs font-medium text-indigo-600 dark:text-indigo-300 mt-2 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded-full w-fit mx-auto border border-indigo-100 dark:border-indigo-900/60'>
                                Click to Upload
                            </div>
                            <input type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                accept=".pdf, .png, .jpg"
                                className='hidden' />
                        </div>

                    ) : (
                        <div className='border border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-900/40 rounded-xl p-4 flex items-center justify-between'>
                            <div className='flex items-center'>
                                {filePreview ? (
                                    <div className='w-12 h-12 rounded-lg bl-slate-200 dark:bg-slate-800 overflow-hidden mr-4 border border-slate-300 dark:border-slate-800'>
                                        <img src={filePreview} alt="Preview" className='w-full h-full object-cover' />
                                    </div>

                                ) : slectedFile.type === 'application/pdf' ? (
                                    <div className='w-12 h-12 rounded-lg bg-red-200 dark:bg-red-900/50 flex items-center justify-center mr-4 border border-red-200 dark:border-red-900/40'>
                                        <FileText className='w-6 h-6 text-red-700 dark:text-red' />
                                    </div>
                                ) : (
                                    <div className='w-12 h-12 rounded-lg bg-white dark:bg-slate-700 flex items-center justify-center mr-4 border border-indigo-100 dark:border-slate-600'>
                                        <FileType className='w-6 h-6 text-slate-700 dark:text-slate-300' />
                                    </div>

                                )}
                                <div>
                                    <p className='text-sm font-bold text-slate-800 dark:text-slate-200 truncate max-w-50'>{slectedFile.name}</p>
                                    <p className='text-xs text-slate-500 dark:text-slate-400'>{(slectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                                </div>
                            </div>
                            <button
                                onClick={clearFile}
                                className='p-2 bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-100 hover:text-red-700 dark:hover:text-red-400 rounded-lg hover:bg-red-50  dark:hover:bg-red-900/30 border border-slate-200 dark:border-slate-600 transition-colors'>
                                <X className='w-4 h-4' />
                            </button>
                        </div>

                    )}
                {/* Optional Text Area */}
                <div className='relative mt-4'>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder={slectedFile ? 'You can also add additional description or instructions here...' : 'Enter project description, scope of work, or any specific requirements...'}
                        className='w-full min-h-[120px] bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md py-2 px-3 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none'
                    />
                </div>
            </div>

            <div className='flex justify-end pt-2 border-t border-slate-100 dark:border-slate-700'>
                <button
                    onClick={handleGenerate}
                    disabled={isLoading || (!description.trim() && !slectedFile)}
                    className={
                        `relative overflow-hidden group flex items-center px-8 py-3.5 rounded-xl font-bold text-white shadow-lg transition-all transform
                    ${isLoading || (!description.trim() && !slectedFile)
                            ? 'bg-slate-300 dark:bg-slate-700 dark:text-slate-500 cursor-not-allowed shadow-none'
                            : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-indigo-500/30 hover:-translate-y-0.5 active:translate-y-0'}
                    `}>
               
                        <div className="flex items-center">
                            Generate BOQ
                            <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </div>

                   
                </button>

            </div>

        </div>
    )
}

export default InputSection
