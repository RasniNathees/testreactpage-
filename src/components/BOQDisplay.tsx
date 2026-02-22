import  { useState, useRef, useEffect } from 'react'
import { AlertTriangle, BadgeCheck, Building2, Calculator, Check, Coins, Edit2, FileText, Globe, Hammer, Info, Mail, MapPin, Phone, PieChart, Plus, PlusCircle, Quote, Save, Star, Trash2, TrendingUp, X } from 'lucide-react'

import type { BOQResponse, Assumption, BOQItem, TradeGroup } from '@/util/types'
import { exportToPDF } from '@/util/exportUtils'
interface BOQDisplayprops {
    data: BOQResponse
}
const ASSUMPTION_CATEGORIES = ['Quantity', 'Specification', 'Site Condition', 'General', 'Pricing'];

function BOQDisplay({ data }: BOQDisplayprops) {
    const [currentData, setCurrentData] = useState<BOQResponse>(data);
    const [selectedItemId, setSlectedItemId] = useState<string | null>(null);
    const [isEditMode, setIsEditMode] = useState(false);

    const [analysisItem, setAnalysisItem] = useState<BOQItem | null>(null);
    const [dimSheetItem, setDimSheetItem] = useState<BOQItem | null>(null);

    // Assumption states
    const [editingAssumptionIndex, setEditingAssumptionIndex] = useState<number | null>(null);
    const [editAssumptionText, setEditAssumptionText] = useState("");
    const [editAssumptionCategory, setEditAssumptionCategory] = useState("");

    const [isAddingAssumption, setIsAddingAssumption] = useState(false);
    const [newAssumptionText, setNewAssumptionText] = useState("");
    const [newAssumptionCategory, setNewAssumptionCategory] = useState("General");

    // Refs for scrolling
    const itemRefs = useRef<Record<string, HTMLTableRowElement | null>>({});

    useEffect(() => {
        setCurrentData(data);
    }, [data]);

    // Scroll to selected item
    useEffect(() => {
        if (selectedItemId && itemRefs.current[selectedItemId] && !isEditMode) {
            itemRefs.current[selectedItemId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            itemRefs.current[selectedItemId]?.classList.add('bg-indigo-50', 'dark:bg-indigo-900/30');
            setTimeout(() => {
                itemRefs.current[selectedItemId]?.classList.remove('bg-indigo-50', 'dark:bg-indigo-900/30');
            }, 2000);
        }
    }, [selectedItemId, isEditMode]);

    const { projectSummary, boqItems, assumptions, recommendedSuppliers, sources, isInsufficientInfo, missingInfoReason } = currentData;

    // Helper to get the full unit rate (Mat + Lab + O&P)
    const getUnitOandP = (item: BOQItem) => {
        if (item.rateAnalysis?.overheadAndProfit !== undefined && item.rateAnalysis.overheadAndProfit !== null) {
            return item.rateAnalysis.overheadAndProfit;
        }
        // Default 15% if not set explicitly
        return (item.rateMaterial + item.rateLabor) * 0.15;
    };

    const getFullUnitRate = (item: BOQItem) => {
        return item.rateMaterial + item.rateLabor + getUnitOandP(item);
    };

    const calcItemTotal = (item: BOQItem) => {
        return item.quantity * getFullUnitRate(item);
    };

    const calcTradeTotal = (items: BOQItem[]) => {
        return items.reduce((sum, item) => sum + calcItemTotal(item), 0);
    };

    // Grand Totals Calculation
    const grandTotal = boqItems.reduce((sum, trade) => sum + calcTradeTotal(trade.items), 0);

    const totalPrimeCost = boqItems.reduce((sum, trade) => {
        return sum + trade.items.reduce((tSum, item) => tSum + (item.quantity * (item.rateMaterial + item.rateLabor)), 0);
    }, 0);

    const totalOverheadAndProfit = boqItems.reduce((sum, trade) => {
        return sum + trade.items.reduce((tSum, item) => tSum + (item.quantity * getUnitOandP(item)), 0);
    }, 0);

    // Format helper
    const fmt = (num: number) => new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: projectSummary.currency || 'USD',
        minimumFractionDigits: 2
    }).format(num);

    const handleRowClick = (id: string) => {
        if (!isEditMode) setSlectedItemId(id);
    };

    // --- CRUD Handlers for Edit Mode ---

    const handleUpdateItem = (tradeIdx: number, itemIdx: number, field: keyof BOQItem | 'overheadAndProfit', value: any) => {
        const newData = { ...currentData };
        const items = [...newData.boqItems[tradeIdx].items];
        const item = { ...items[itemIdx] };

        if (field === 'overheadAndProfit') {
            // Special handling for O&P which is nested in rateAnalysis
            item.rateAnalysis = {
                ...item.rateAnalysis,
                baseMaterial: item.rateMaterial, // keep sync
                baseLabor: item.rateLabor,       // keep sync
                plantAndEquipment: item.rateAnalysis?.plantAndEquipment || 0,
                narrative: item.rateAnalysis?.narrative || '',
                overheadAndProfit: parseFloat(value) || 0
            };
        } else {
            // @ts-ignore
            item[field] = value;
            // Ensure numbers are parsed
            if (['quantity', 'rateMaterial', 'rateLabor'].includes(field)) {
                // @ts-ignore
                item[field] = parseFloat(value) || 0;
            }
        }

        items[itemIdx] = item;
        newData.boqItems[tradeIdx] = { ...newData.boqItems[tradeIdx], items };
        setCurrentData(newData);
    };

    const handleAddItem = (tradeIdx: number) => {
        const newData = { ...currentData };
        const trade = newData.boqItems[tradeIdx];

        // Intelligent Numbering Logic
        // Default fallback
        let nextItemNo = `${tradeIdx + 1}.${trade.items.length + 1}`;

        if (trade.items.length > 0) {
            const lastItem = trade.items[trade.items.length - 1];
            // Try to parse the last item number
            const parts = lastItem.itemNo.split('.');
            if (parts.length > 0) {
                const lastSegment = parts[parts.length - 1];
                const lastNum = parseInt(lastSegment, 10);

                if (!isNaN(lastNum)) {
                    // Increment the last segment (e.g. 1.3.1 -> 1.3.2)
                    parts[parts.length - 1] = (lastNum + 1).toString();
                    nextItemNo = parts.join('.');
                }
            }
        }

        const newItem: BOQItem = {
            id: `new-${Date.now()}`,
            itemNo: nextItemNo,
            description: "New Item Description",
            unit: "ea",
            quantity: 1,
            quantityFormula: "",
            rateMaterial: 0,
            rateLabor: 0,
            totalRate: 0,
            totalCost: 0,
            rateAnalysis: {
                baseMaterial: 0,
                baseLabor: 0,
                plantAndEquipment: 0,
                overheadAndProfit: 0,
                narrative: "Manual Entry"
            }
        };

        trade.items.push(newItem);
        setCurrentData(newData);
    };

    const handleDeleteItem = (tradeIdx: number, itemIdx: number) => {
        const newData = { ...currentData };
        newData.boqItems[tradeIdx].items.splice(itemIdx, 1);
        setCurrentData(newData);
    };

    const handleUpdateTradeName = (tradeIdx: number, name: string) => {
        const newData = { ...currentData };
        newData.boqItems[tradeIdx].tradeName = name;
        setCurrentData(newData);
    };

    const handleAddTrade = () => {
        const newData = { ...currentData };
        const newTrade: TradeGroup = {
            tradeName: "New Trade Section",
            tradeTotal: 0,
            items: []
        };
        newData.boqItems.push(newTrade);
        setCurrentData(newData);
    };

    const handleDeleteTrade = (tradeIdx: number) => {
        if (window.confirm("Are you sure you want to delete this entire section?")) {
            const newData = { ...currentData };
            newData.boqItems.splice(tradeIdx, 1);
            setCurrentData(newData);
        }
    };

    // --- Assumption Handlers ---
    const handleAddAssumption = () => {
        if (!newAssumptionText.trim()) return;
        const newAssumption: Assumption = {
            category: newAssumptionCategory,
            text: newAssumptionText.trim()
        };
        const updatedAssumptions = [...assumptions, newAssumption];
        setCurrentData({ ...currentData, assumptions: updatedAssumptions });
        setNewAssumptionText("");
        setIsAddingAssumption(false);
    };

    const handleDeleteAssumption = (index: number) => {
        const updatedAssumptions = assumptions.filter((_, i) => i !== index);
        setCurrentData({ ...currentData, assumptions: updatedAssumptions });
    };

    const startEditAssumption = (index: number) => {
        setEditingAssumptionIndex(index);
        setEditAssumptionText(assumptions[index].text);
        setEditAssumptionCategory(assumptions[index].category);
    };

    const saveEditAssumption = () => {
        if (editingAssumptionIndex === null) return;
        const updatedAssumptions = [...assumptions];
        updatedAssumptions[editingAssumptionIndex] = {
            category: editAssumptionCategory,
            text: editAssumptionText
        };
        setCurrentData({ ...currentData, assumptions: updatedAssumptions });
        setEditingAssumptionIndex(null);
    };

    if (isInsufficientInfo) {
        return (
            <div className="bg-red-50 p-6 rounded-xl border border-red-200">
                <h3 className="text-red-800 font-bold mb-2">Estimation Failed</h3>
                <p className="text-red-600">{missingInfoReason}</p>
            </div>
        );
    }
    return (
        <div className="animate-fade-in pb-10">

            {/* Top Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">

                {/* Main Cost Card */}
                <div className="md:col-span-2 bg-gradient-to-br from-indigo-900 to-slate-900 rounded-2xl p-6 text-white shadow-xl shadow-indigo-900/20 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <TrendingUp className="w-32 h-32 -mr-4 -mt-4" />
                    </div>
                    <div className="relative z-10">
                        <p className="text-indigo-200 text-xs font-bold uppercase tracking-wider mb-1">Total Estimated Cost</p>
                        <h2 className="text-4xl font-extrabold mb-2 text-white tracking-tight">{fmt(grandTotal)}</h2>
                        <div className="flex items-center gap-2 mt-4">
                            <div className="flex items-center text-xs text-indigo-300 bg-indigo-800/50 px-2 py-1 rounded-lg backdrop-blur-sm border border-indigo-700">
                                <TrendingUp className="w-3 h-3 mr-1.5" />
                                {projectSummary.measurementStandard}
                            </div>
                            <div className="flex items-center text-xs text-indigo-300 bg-indigo-800/50 px-2 py-1 rounded-lg backdrop-blur-sm border border-indigo-700">
                                <Globe className="w-3 h-3 mr-1.5" />
                                {projectSummary.currency}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Breakdown Card: Prime Cost */}
                <div className="md:col-span-1 bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-2 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
                            <Hammer className="w-4 h-4" /> Prime Cost
                        </div>
                        <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{fmt(totalPrimeCost)}</div>
                        <div className="text-xs text-slate-400 mt-1">Material + Labor + Plant</div>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full mt-4 overflow-hidden">
                        <div className="bg-blue-500 h-full rounded-full" style={{ width: `${(totalPrimeCost / grandTotal) * 100}%` }}></div>
                    </div>
                </div>

                {/* Breakdown Card: Overhead & Profit */}
                <div className="md:col-span-1 bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-2 text-amber-600 dark:text-amber-500 text-xs font-bold uppercase tracking-wider">
                            <Coins className="w-4 h-4" /> Overhead & Profit
                        </div>
                        <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{fmt(totalOverheadAndProfit)}</div>
                        <div className="text-xs text-slate-400 mt-1">Margin & Preliminaries</div>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full mt-4 overflow-hidden">
                        <div className="bg-amber-500 h-full rounded-full" style={{ width: `${(totalOverheadAndProfit / grandTotal) * 100}%` }}></div>
                    </div>
                </div>

                {/* Project Info Bar */}
                <div className="md:col-span-4 bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 flex flex-wrap justify-between items-center gap-4">
                    <div className="flex items-center gap-4">
                        <div>
                            <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">{projectSummary.projectType}</h3>
                            <div className="text-xs text-slate-500">{projectSummary.structure} • {projectSummary.floor}</div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {sources && sources.length > 0 && (
                            <div className="flex -space-x-2 mr-4">
                                {sources.slice(0, 3).map((_, i) => (
                                    <div key={i} className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 border-2 border-white dark:border-slate-800 flex items-center justify-center text-[10px] font-bold text-blue-600">
                                        <Globe className="w-3 h-3" />
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Edit Toggle */}
                        <button
                            onClick={() => setIsEditMode(!isEditMode)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${isEditMode
                                    ? 'bg-amber-100 text-amber-700 border border-amber-200 shadow-inner'
                                    : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600'
                                }`}
                        >
                            {isEditMode ? <Save className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
                            {isEditMode ? "Done Editing" : "Edit BOQ"}
                        </button>

                        <button
                            onClick={() => exportToPDF(currentData)}
                            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors shadow-sm shadow-indigo-200 dark:shadow-none"
                        >
                            <FileText className="w-4 h-4" /> Export PDF
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="space-y-6">

                {/* BOQ Table */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg shadow-slate-200/50 dark:shadow-none border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left border-collapse relative">
                            <thead className="bg-slate-50 dark:bg-slate-900/80 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider border-b border-slate-200 dark:border-slate-700 backdrop-blur-sm">
                                <tr>
                                    <th className="px-6 py-4 font-semibold w-16">No.</th>
                                    <th className="px-6 py-4 font-semibold">Description</th>
                                    <th className="px-4 py-4 font-semibold text-center w-20">Qty</th>
                                    <th className="px-6 py-4 font-semibold text-right w-28">Mat</th>
                                    <th className="px-6 py-4 font-semibold text-right w-28">Lab</th>
                                    <th className="px-6 py-4 font-semibold text-right w-28 text-amber-600 dark:text-amber-500">O&P</th>
                                    <th className="px-6 py-4 font-semibold text-right w-32 bg-slate-50/50 dark:bg-white/5">All-in Rate</th>
                                    <th className="px-6 py-4 font-semibold text-right w-36">Total</th>
                                    {isEditMode && <th className="px-2 py-4 w-10"></th>}
                                </tr>
                            </thead>
                            {boqItems.map((trade, tIdx) => (
                                <tbody key={tIdx} className="border-b border-slate-200 dark:border-slate-700 last:border-0">
                                    <tr className="bg-slate-100/80 dark:bg-slate-700/30">
                                        <td colSpan={isEditMode ? 9 : 8} className="px-6 py-3">
                                            <div className="flex justify-between items-center group">
                                                <div className="flex items-center w-full">
                                                    <span className="w-2 h-2 rounded-full bg-indigo-500 mr-2"></span>
                                                    {isEditMode ? (
                                                        <input
                                                            value={trade.tradeName}
                                                            onChange={(e) => handleUpdateTradeName(tIdx, e.target.value)}
                                                            className="font-bold text-xs text-slate-800 dark:text-slate-100 uppercase tracking-wide bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded px-2 py-1 w-1/2 focus:ring-2 focus:ring-indigo-500"
                                                        />
                                                    ) : (
                                                        <span className="font-bold text-xs text-slate-700 dark:text-slate-200 uppercase tracking-wide">
                                                            {trade.tradeName}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-slate-600 dark:text-slate-400 font-mono text-xs font-bold bg-slate-200 dark:bg-slate-600 px-2 py-1 rounded">
                                                        {fmt(calcTradeTotal(trade.items))}
                                                    </span>
                                                    {isEditMode && (
                                                        <button
                                                            onClick={() => handleDeleteTrade(tIdx)}
                                                            className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                                                            title="Delete Section"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                    {trade.items.map((item, iIdx) => (
                                        <tr
                                            key={item.id}
                                            ref={el => { itemRefs.current[item.id] = el; }}
                                            onClick={() => handleRowClick(item.id)}
                                            className={`group transition-all duration-200 border-b border-slate-50 dark:border-slate-700/50 cursor-pointer ${selectedItemId === item.id && !isEditMode ? 'bg-indigo-50 dark:bg-indigo-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                                        >
                                            <td className="px-6 py-4 text-slate-400 text-xs font-mono align-top pt-5">
                                                {isEditMode ? (
                                                    <input
                                                        value={item.itemNo}
                                                        onChange={(e) => handleUpdateItem(tIdx, iIdx, 'itemNo', e.target.value)}
                                                        className="w-12 bg-transparent border-b border-slate-300 dark:border-slate-600 text-xs focus:outline-none focus:border-indigo-500"
                                                    />
                                                ) : item.itemNo}
                                            </td>
                                            <td className="px-6 py-4 align-top">
                                                {isEditMode ? (
                                                    <textarea
                                                        value={item.description}
                                                        onChange={(e) => handleUpdateItem(tIdx, iIdx, 'description', e.target.value)}
                                                        className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 resize-none h-20"
                                                    />
                                                ) : (
                                                    <>
                                                        <div className="font-medium text-slate-800 dark:text-slate-200 leading-relaxed">{item.description}</div>
                                                        {item.remarks && (
                                                            <div className="mt-2 text-xs bg-amber-50 dark:bg-amber-900/10 text-amber-800 dark:text-amber-200 p-2 rounded border border-amber-100 dark:border-amber-900/30 flex items-start gap-2">
                                                                <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                                                <span><span className="font-bold">Criticality:</span> {item.remarks}</span>
                                                            </div>
                                                        )}
                                                        <div className="flex gap-2 mt-3  transition-opacity translate-y-1 group-hover:translate-y-0 duration-200">
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); setDimSheetItem(item); }}
                                                                className="text-[10px] flex items-center bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-2 py-1 rounded-md text-slate-500 hover:text-indigo-600 hover:border-indigo-200 transition-colors shadow-sm"
                                                            >
                                                                <Calculator className="w-3 h-3 mr-1.5" /> Dim Sheet
                                                            </button>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); setAnalysisItem(item); }}
                                                                className="text-[10px] flex items-center bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-2 py-1 rounded-md text-slate-500 hover:text-indigo-600 hover:border-indigo-200 transition-colors shadow-sm"
                                                            >
                                                                <PieChart className="w-3 h-3 mr-1.5" /> Rate Analysis
                                                            </button>
                                                        </div>
                                                    </>
                                                )}
                                            </td>
                                            <td className="px-4 py-4 text-center align-top pt-5">
                                                {isEditMode ? (
                                                    <div className="flex flex-col gap-1">
                                                        <input
                                                            type="number"
                                                            value={item.quantity}
                                                            onChange={(e) => handleUpdateItem(tIdx, iIdx, 'quantity', e.target.value)}
                                                            className="w-16 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded px-1 py-1 text-xs text-center focus:ring-2 focus:ring-indigo-500"
                                                        />
                                                        <input
                                                            value={item.unit}
                                                            onChange={(e) => handleUpdateItem(tIdx, iIdx, 'unit', e.target.value)}
                                                            className="w-16 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded px-1 py-1 text-[10px] text-center focus:ring-2 focus:ring-indigo-500"
                                                        />
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div className="font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700/50 rounded px-2 py-0.5 inline-block min-w-[3rem]">{item.quantity}</div>
                                                        <div className="text-[10px] text-slate-400 mt-1">{item.unit}</div>
                                                    </>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right text-slate-500 dark:text-slate-500 font-mono text-xs align-top pt-5">
                                                {isEditMode ? (
                                                    <input
                                                        type="number"
                                                        value={item.rateMaterial}
                                                        onChange={(e) => handleUpdateItem(tIdx, iIdx, 'rateMaterial', e.target.value)}
                                                        className="w-20 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded px-1 py-1 text-right focus:ring-2 focus:ring-indigo-500"
                                                    />
                                                ) : fmt(item.rateMaterial)}
                                            </td>
                                            <td className="px-6 py-4 text-right text-slate-500 dark:text-slate-500 font-mono text-xs align-top pt-5">
                                                {isEditMode ? (
                                                    <input
                                                        type="number"
                                                        value={item.rateLabor}
                                                        onChange={(e) => handleUpdateItem(tIdx, iIdx, 'rateLabor', e.target.value)}
                                                        className="w-20 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded px-1 py-1 text-right focus:ring-2 focus:ring-indigo-500"
                                                    />
                                                ) : fmt(item.rateLabor)}
                                            </td>
                                            <td className="px-6 py-4 text-right text-amber-600 dark:text-amber-500 font-mono text-xs align-top pt-5 font-medium">
                                                {isEditMode ? (
                                                    <input
                                                        type="number"
                                                        value={getUnitOandP(item).toFixed(2)}
                                                        onChange={(e) => handleUpdateItem(tIdx, iIdx, 'overheadAndProfit', e.target.value)}
                                                        className="w-20 bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-800 rounded px-1 py-1 text-right text-amber-600 focus:ring-2 focus:ring-amber-500"
                                                    />
                                                ) : fmt(getUnitOandP(item))}
                                            </td>
                                            <td className="px-6 py-4 text-right text-slate-800 dark:text-slate-300 font-mono text-xs font-bold align-top pt-5 bg-slate-50/50 dark:bg-white/5">
                                                {fmt(getFullUnitRate(item))}
                                            </td>
                                            <td className="px-6 py-4 text-right font-bold text-indigo-700 dark:text-indigo-400 font-mono text-xs align-top pt-5">
                                                {fmt(calcItemTotal(item))}
                                            </td>
                                            {isEditMode && (
                                                <td className="px-2 py-4 align-top pt-5">
                                                    <button
                                                        onClick={() => handleDeleteItem(tIdx, iIdx)}
                                                        className="text-slate-300 hover:text-red-500 transition-colors"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                    {isEditMode && (
                                        <tr>
                                            <td colSpan={9} className="px-6 py-2 bg-slate-50 dark:bg-slate-800/50">
                                                <button
                                                    onClick={() => handleAddItem(tIdx)}
                                                    className="flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-200 py-1"
                                                >
                                                    <PlusCircle className="w-4 h-4" /> Add Item
                                                </button>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            ))}
                        </table>
                    </div>

                    {isEditMode && (
                        <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 flex justify-center">
                            <button
                                onClick={handleAddTrade}
                                className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 px-6 py-3 rounded-xl shadow-sm hover:shadow-md text-slate-700 dark:text-slate-200 font-bold text-sm transition-all hover:bg-slate-50"
                            >
                                <Plus className="w-5 h-5 text-indigo-500" />
                                Add New Section
                            </button>
                        </div>
                    )}
                </div>

                {/* Bottom Grid: Assumptions & Suppliers */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                    {/* Assumptions Panel */}
                    <div className="bg-amber-50/50 dark:bg-amber-900/5 border border-amber-100 dark:border-amber-900/20 rounded-2xl p-6 shadow-sm">
                        <div className="flex justify-between items-center mb-5">
                            <h4 className="text-sm font-bold text-amber-900 dark:text-amber-100 uppercase tracking-wider flex items-center">
                                <AlertTriangle className="w-4 h-4 mr-2" /> Assumptions & Notes
                            </h4>
                            {!isAddingAssumption && (
                                <button
                                    onClick={() => setIsAddingAssumption(true)}
                                    className="text-xs bg-white dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 text-amber-800 dark:text-amber-200 px-3 py-1.5 rounded-lg shadow-sm hover:bg-amber-50 transition-colors flex items-center"
                                >
                                    <Plus className="w-3 h-3 mr-1.5" /> Add Note
                                </button>
                            )}
                        </div>

                        {isAddingAssumption && (
                            <div className="mb-4 bg-white dark:bg-slate-800 p-4 rounded-xl border border-amber-200 dark:border-amber-800 shadow-sm animate-fade-in">
                                <div className="flex flex-col gap-3">
                                    <select
                                        value={newAssumptionCategory}
                                        onChange={(e) => setNewAssumptionCategory(e.target.value)}
                                        className="text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-amber-500/20"
                                    >
                                        {ASSUMPTION_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                    <textarea
                                        className="text-xs p-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 min-h-[80px] outline-none text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-amber-500/20 resize-none"
                                        placeholder="Enter assumption details..."
                                        value={newAssumptionText}
                                        onChange={e => setNewAssumptionText(e.target.value)}
                                    />
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => setIsAddingAssumption(false)} className="text-xs text-slate-500 hover:text-slate-700 px-3 py-1.5">Cancel</button>
                                        <button onClick={handleAddAssumption} className="text-xs bg-amber-600 text-white px-4 py-1.5 rounded-lg hover:bg-amber-700 shadow-sm shadow-amber-600/20">Save Note</button>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                            {assumptions.map((a, i) => (
                                <div key={i} className="group flex items-start justify-between bg-white dark:bg-slate-800/80 p-4 rounded-xl border border-amber-100 dark:border-amber-900/30 hover:border-amber-300 dark:hover:border-amber-700 transition-all shadow-sm hover:shadow-md">
                                    {editingAssumptionIndex === i ? (
                                        <div className="flex-1 flex flex-col gap-2">
                                            <select
                                                value={editAssumptionCategory}
                                                onChange={(e) => setEditAssumptionCategory(e.target.value)}
                                                className="text-xs p-2 rounded border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700"
                                            >
                                                {ASSUMPTION_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                            <textarea
                                                value={editAssumptionText}
                                                onChange={(e) => setEditAssumptionText(e.target.value)}
                                                className="text-xs p-2 rounded border border-slate-200 dark:border-slate-600 w-full min-h-[60px]"
                                            />
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => setEditingAssumptionIndex(null)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
                                                <button onClick={saveEditAssumption} className="p-1 text-green-600 hover:text-green-700"><Check className="w-4 h-4" /></button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex-1">
                                                <span className="inline-flex items-center text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-2 py-0.5 rounded-full mb-2 border border-amber-100 dark:border-amber-900/50">
                                                    {a.category}
                                                </span>
                                                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">{a.text}</p>
                                            </div>
                                            <div className="flex flex-col gap-1 ml-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => startEditAssumption(i)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                                                <button onClick={() => handleDeleteAssumption(i)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Recommended Suppliers Panel */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 flex flex-col h-full">
                        <div className="flex items-center gap-2 mb-5 text-slate-800 dark:text-white font-bold text-sm uppercase tracking-wider">
                            <Building2 className="w-4 h-4 text-indigo-500" />
                            Recommended Vendor List
                        </div>
                        <div className="space-y-3 overflow-y-auto max-h-[400px] custom-scrollbar pr-2">
                            {recommendedSuppliers?.map((supplier, idx) => (
                                <div key={idx} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/30 border border-slate-100 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-500/50 hover:bg-white dark:hover:bg-slate-700/80 transition-all group shadow-sm hover:shadow-md">
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-300 uppercase tracking-wide bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded border border-indigo-100 dark:border-indigo-800">{supplier.trade}</span>
                                            <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm mt-1.5">{supplier.name}</h4>
                                            {supplier.location && (
                                                <div className="flex items-center text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                                                    <MapPin className="w-3 h-3 mr-1" /> {supplier.location}
                                                </div>
                                            )}
                                        </div>
                                        {supplier.serviceLevel && (
                                            <span className="text-[10px] flex items-center text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 px-2 py-1 rounded-full border border-slate-200 dark:border-slate-600 shadow-sm">
                                                <BadgeCheck className="w-3 h-3 mr-1 text-green-500" />
                                                {supplier.serviceLevel}
                                            </span>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                                        <div className="flex items-center text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800/50 p-2 rounded-lg border border-slate-100 dark:border-slate-700/50">
                                            <Phone className="w-3.5 h-3.5 mr-2 text-indigo-400" />
                                            {supplier.phoneNumber || "N/A"}
                                        </div>
                                        <div className="flex items-center text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800/50 p-2 rounded-lg border border-slate-100 dark:border-slate-700/50">
                                            <Mail className="w-3.5 h-3.5 mr-2 text-indigo-400" />
                                            {supplier.email || "N/A"}
                                        </div>
                                        {supplier.website && (
                                            <a href={supplier.website} target="_blank" rel="noopener noreferrer" className="col-span-1 sm:col-span-2 flex items-center text-xs text-indigo-500 hover:text-indigo-700 bg-white dark:bg-slate-800/50 p-2 rounded-lg border border-slate-100 dark:border-slate-700/50 hover:bg-indigo-50 transition-colors">
                                                <Globe className="w-3.5 h-3.5 mr-2" />
                                                {supplier.website.replace(/^https?:\/\//, '')}
                                            </a>
                                        )}
                                    </div>

                                    {(supplier.specialization || supplier.typicalProjectSize) && (
                                        <div className="mt-3 text-[11px] text-slate-600 dark:text-slate-400 grid grid-cols-2 gap-2">
                                            {supplier.specialization && (
                                                <div className="bg-slate-100 dark:bg-slate-800/50 p-1.5 rounded">
                                                    <span className="font-semibold block text-slate-500 dark:text-slate-500 text-[9px] uppercase">Specialization</span>
                                                    {supplier.specialization}
                                                </div>
                                            )}
                                            {supplier.typicalProjectSize && (
                                                <div className="bg-slate-100 dark:bg-slate-800/50 p-1.5 rounded">
                                                    <span className="font-semibold block text-slate-500 dark:text-slate-500 text-[9px] uppercase">Project Size</span>
                                                    {supplier.typicalProjectSize}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {(supplier.ratings || supplier.testimonials) && (
                                        <div className="mt-3 p-2.5 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-lg text-xs text-slate-600 dark:text-slate-300 border border-indigo-100 dark:border-indigo-900/30">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Quote className="w-3 h-3 text-indigo-400" />
                                                {supplier.ratings && (
                                                    <div className="flex items-center text-amber-500 font-bold text-[10px]">
                                                        <Star className="w-3 h-3 fill-amber-500 mr-1" />
                                                        {supplier.ratings}
                                                    </div>
                                                )}
                                            </div>
                                            <p className="italic text-[11px]">"{supplier.testimonials || "Highly recommended for this scope."}"</p>
                                        </div>
                                    )}

                                    {supplier.estimatedQuote && (
                                        <div className="mt-2 text-[10px] text-slate-400 border-t border-slate-100 dark:border-slate-700 pt-2 flex justify-between">
                                            <span>Est. Quote Reference:</span>
                                            <span className="font-mono text-slate-600 dark:text-slate-300">{supplier.estimatedQuote}</span>
                                        </div>
                                    )}
                                </div>
                            ))}
                            {(!recommendedSuppliers || recommendedSuppliers.length === 0) && (
                                <div className="flex flex-col items-center justify-center py-12 text-slate-400 text-xs border-2 border-dashed border-slate-100 dark:border-slate-700 rounded-xl">
                                    <Building2 className="w-8 h-8 mb-2 text-slate-300 dark:text-slate-600" />
                                    No vendors recommended for this project scope.
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </div>

            {/* --- MODALS --- */}

            {/* Rate Analysis Modal */}
            {analysisItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md p-4 animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden ring-1 ring-white/10">
                        <div className="bg-slate-50 dark:bg-slate-800/80 px-6 py-4 flex justify-between items-center border-b border-slate-200 dark:border-slate-700">
                            <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                <PieChart className="w-5 h-5 text-indigo-500" /> Rate Build-up
                            </h3>
                            <button onClick={() => setAnalysisItem(null)} className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"><X className="w-5 h-5 text-slate-500" /></button>
                        </div>
                        <div className="p-6">
                            <p className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-6 bg-slate-50 dark:bg-slate-800 p-3 rounded-lg border border-slate-100 dark:border-slate-700">{analysisItem.description}</p>
                            <div className="space-y-4 text-sm">
                                <div className="flex justify-between items-center pb-2 border-b border-dashed border-slate-200 dark:border-slate-700">
                                    <span className="text-slate-500">Base Material Cost</span>
                                    <span className="font-mono font-medium">{fmt(analysisItem.rateAnalysis?.baseMaterial || analysisItem.rateMaterial)}</span>
                                </div>
                                <div className="flex justify-between items-center pb-2 border-b border-dashed border-slate-200 dark:border-slate-700">
                                    <span className="text-slate-500">Labor Component</span>
                                    <span className="font-mono font-medium">{fmt(analysisItem.rateAnalysis?.baseLabor || analysisItem.rateLabor)}</span>
                                </div>
                                <div className="flex justify-between items-center pb-2 border-b border-dashed border-slate-200 dark:border-slate-700">
                                    <span className="text-slate-500">Plant & Equipment</span>
                                    <span className="font-mono font-medium">{fmt(analysisItem.rateAnalysis?.plantAndEquipment || 0)}</span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-amber-50 dark:bg-amber-900/10 rounded-lg border border-amber-100 dark:border-amber-900/30">
                                    <span className="text-amber-800 dark:text-amber-400 font-bold text-xs uppercase tracking-wide">Overhead & Profit</span>
                                    <span className="font-mono font-bold text-amber-800 dark:text-amber-400">{fmt(getUnitOandP(analysisItem))}</span>
                                </div>
                                <div className="mt-4 pt-4 flex justify-between items-center text-lg font-bold border-t border-slate-200 dark:border-slate-700">
                                    <span>Unit Rate Total</span>
                                    <span className="text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1 rounded-lg">{fmt(getFullUnitRate(analysisItem))}</span>
                                </div>
                            </div>
                            {analysisItem.rateAnalysis?.narrative && (
                                <div className="mt-5 bg-slate-50 dark:bg-slate-800 p-3 rounded-lg text-xs text-slate-500 italic border border-slate-100 dark:border-slate-700 flex gap-2">
                                    <div className="w-1 bg-indigo-400 rounded-full"></div>
                                    "{analysisItem.rateAnalysis.narrative}"
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Dim Sheet Modal */}
            {dimSheetItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md p-4 animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden ring-1 ring-white/10">
                        <div className="bg-slate-50 dark:bg-slate-800/80 px-6 py-4 flex justify-between items-center border-b border-slate-200 dark:border-slate-700">
                            <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                <Calculator className="w-5 h-5 text-indigo-500" /> Quantity Take-off (Dim Sheet)
                            </h3>
                            <button onClick={() => setDimSheetItem(null)} className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"><X className="w-5 h-5 text-slate-500" /></button>
                        </div>
                        <div className="p-6">
                            <p className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-6 bg-slate-50 dark:bg-slate-800 p-3 rounded-lg border border-slate-100 dark:border-slate-700">{dimSheetItem.description}</p>

                            <div className="bg-slate-50 dark:bg-black/20 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 font-mono text-sm space-y-4 shadow-inner">
                                <div className="flex flex-col gap-2">
                                    <div className="text-slate-400 text-[10px] uppercase tracking-wider font-bold">Calculation Formula</div>
                                    <div className="text-slate-800 dark:text-indigo-300 font-bold text-base border-b border-dashed border-slate-300 dark:border-slate-600 pb-2">
                                        {dimSheetItem.quantityFormula || "Direct measurement from provided text/drawing."}
                                    </div>
                                </div>
                                <div className="flex items-center justify-between pt-2">
                                    <div className="text-slate-400 text-[10px] uppercase tracking-wider font-bold">Final Quantity</div>
                                    <div className="text-2xl font-black text-slate-900 dark:text-white flex items-baseline gap-1">
                                        {dimSheetItem.quantity}
                                        <span className="text-sm font-bold text-slate-500">{dimSheetItem.unit}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6 flex items-center gap-2 text-xs text-slate-400 justify-center bg-slate-50 dark:bg-slate-800/50 py-2 rounded-lg">
                                <Check className="w-3 h-3 text-green-500" />
                                Calculation based on standard method: <span className="font-bold text-slate-600 dark:text-slate-300">{projectSummary.measurementStandard}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    )
}

export default BOQDisplay
