import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import { Download } from "lucide-react";
import bodyFatRangeIcon from "../SAMPLES/ICONS/Body_Fat_Range_Icon-removebg-preview.png";
import bodyWaterRangeIcon from "../SAMPLES/ICONS/Body_Water_Range_Icon-removebg-preview.png";
import muscleMassIcon from "../SAMPLES/ICONS/Muscle_Mass_Icon-removebg-preview.png";
import physiqueRatingsIcon from "../SAMPLES/ICONS/BMR_Icon-removebg-preview.png";
import basalMetabolicAgeIcon from "../SAMPLES/ICONS/Basal_Metabolic_Age_Icon-removebg-preview.png";
import boneMassIcon from "../SAMPLES/ICONS/Bone_Mass_Icon-removebg-preview.png";
import visceralFatIcon from "../SAMPLES/ICONS/Visceral_Fat_Icon-removebg-preview.png";
import wellnessLogo from "../SAMPLES/LOGO-removebg-preview.png";

const WellnessForm = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [appointments, setAppointments] = useState(Array(26).fill({
    age: '', height: '', weight: '', bodyFat: '', water: '', muscle: '', 
    physique: '', bmr: '', basal: '', bone: '', visceral: ''
  }));
  
  const [evaluation, setEvaluation] = useState({
    bodyFat: 'excellent',
    bodyWater: 'excellent',
    muscleMass: 'excellent',
    visceralFat: 'excellent',
    questionnaire: 'excellent'
  });

  const [page2Data, setPage2Data] = useState({
    date: '',
    name: '',
    coach: ''
  });

  const updateAppointment = (index, field, value) => {
    const newAppointments = [...appointments];
    newAppointments[index] = { ...newAppointments[index], [field]: value };
    setAppointments(newAppointments);
  };

  const exportToPDF = () => {
    window.print();
  };

  const formatDateToDisplay = (date) => {
    const day = String(date.getDate()).padStart(2, "0");
    const monthName = date.toLocaleString("en-US", { month: "long" }).toUpperCase();
    const year = date.getFullYear();
    return `${day}-${monthName}-${year}`;
  };

  const setTodayDate = () => {
    setPage2Data({ ...page2Data, date: formatDateToDisplay(new Date()) });
  };

  return (
    <div className="bg-gray-100">
      {/* Page Navigation */}
      <div className="flex justify-center gap-4 p-4 print:hidden">
        <button 
          onClick={() => setCurrentPage(1)}
          className={`px-6 py-2 rounded ${currentPage === 1 ? 'bg-blue-600 text-white' : 'bg-gray-300'}`}
        >
          Page 1
        </button>
        <button 
          onClick={() => setCurrentPage(2)}
          className={`px-6 py-2 rounded ${currentPage === 2 ? 'bg-blue-600 text-white' : 'bg-gray-300'}`}
        >
          Page 2
        </button>
        <button 
          onClick={exportToPDF}
          className="bg-[#6b8e23] text-white px-6 py-2 rounded flex items-center gap-2 hover:bg-[#556b2f]"
        >
          <Download size={20} />
          Export as PDF
        </button>
      </div>

      {/* Page 1 */}
      {currentPage === 1 && (
        <div className="max-w-7xl mx-auto bg-white shadow-lg p-6 page-break">
          <div className="grid grid-cols-2 gap-4">
            {/* Left Section */}
            <div className="border-2 border-black flex flex-col">
              <div className="border-b-2 border-black p-2 font-bold text-center text-sm">
                Please bring along this Pass to your next appointment
              </div>
              
              {/* Table Headers */}
              <div className="grid grid-cols-11 text-xs border-b border-black">
                <div className="border-r border-black p-1 text-center font-semibold">Age:</div>
                <div className="border-r border-black p-1 text-center">Height<br/>cm</div>
                <div className="border-r border-black p-1 text-center">Weight<br/>KG</div>
                <div className="border-r border-black p-1 text-center">Body Fat<br/>Range</div>
                <div className="border-r border-black p-1 text-center">% Body<br/>Water<br/>Range</div>
                <div className="border-r border-black p-1 text-center">Muscle<br/>Mass</div>
                <div className="border-r border-black p-1 text-center">Physique<br/>Ratings</div>
                <div className="border-r border-black p-1 text-center">BMR</div>
                <div className="border-r border-black p-1 text-center">Basal<br/>Metabolic<br/>Age</div>
                <div className="border-r border-black p-1 text-center">Bone<br/>Mass</div>
                <div className="p-1 text-center">Visceral<br/>Fat</div>
              </div>

              {/* First Row with Icons */}
              <div className="grid grid-cols-11 text-xs border-b border-black bg-gray-50">
                <div className="border-r border-black p-1 text-center text-xs">Your next<br/>appoint-<br/>ment</div>
                <div className="border-r border-black p-1 text-center">Height<br/>cm</div>
                <div className="border-r border-black p-1 text-center">Weight<br/>KG</div>
                <div className="border-r border-black p-1 flex justify-center items-center">
                  <img src={bodyFatRangeIcon} alt="Body fat range" className="h-9 w-9 object-contain" />
                </div>
                <div className="border-r border-black p-1 flex justify-center items-center">
                  <img src={bodyWaterRangeIcon} alt="Body water range" className="h-9 w-9 object-contain" />
                </div>
                <div className="border-r border-black p-1 flex justify-center items-center">
                  <img src={muscleMassIcon} alt="Muscle mass" className="h-9 w-9 object-contain" />
                </div>
                <div className="border-r border-black p-1 flex justify-center items-center">
                  <img src={physiqueRatingsIcon} alt="Physique ratings" className="h-9 w-9 object-contain" />
                </div>
                <div className="border-r border-black p-1 flex justify-center items-center">
                  <img src={basalMetabolicAgeIcon} alt="Basal metabolic rate" className="h-9 w-9 object-contain" />
                </div>
                <div className="border-r border-black p-1 flex justify-center items-center">
                  <img src={basalMetabolicAgeIcon} alt="Basal metabolic age" className="h-9 w-9 object-contain" />
                </div>
                <div className="border-r border-black p-1 flex justify-center items-center">
                  <img src={boneMassIcon} alt="Bone mass" className="h-9 w-9 object-contain" />
                </div>
                <div className="p-1 flex justify-center items-center">
                  <img src={visceralFatIcon} alt="Visceral fat" className="h-9 w-9 object-contain" />
                </div>
              </div>

              {/* Data Rows */}
              {appointments.slice(0, 26).map((apt, idx) => (
                <div key={idx} className="grid grid-cols-11 text-xs border-b border-gray-300">
                  <input className="border-r border-black p-0.5 text-center w-full text-xs" value={apt.age} onChange={(e) => updateAppointment(idx, 'age', e.target.value)} />
                  <input className="border-r border-black p-0.5 text-center w-full text-xs" value={apt.height} onChange={(e) => updateAppointment(idx, 'height', e.target.value)} />
                  <input className="border-r border-black p-0.5 text-center w-full text-xs" value={apt.weight} onChange={(e) => updateAppointment(idx, 'weight', e.target.value)} />
                  <input className="border-r border-black p-0.5 text-center w-full text-xs" value={apt.bodyFat} onChange={(e) => updateAppointment(idx, 'bodyFat', e.target.value)} />
                  <input className="border-r border-black p-0.5 text-center w-full text-xs" value={apt.water} onChange={(e) => updateAppointment(idx, 'water', e.target.value)} />
                  <input className="border-r border-black p-0.5 text-center w-full text-xs" value={apt.muscle} onChange={(e) => updateAppointment(idx, 'muscle', e.target.value)} />
                  <input className="border-r border-black p-0.5 text-center w-full text-xs" value={apt.physique} onChange={(e) => updateAppointment(idx, 'physique', e.target.value)} />
                  <input className="border-r border-black p-0.5 text-center w-full text-xs" value={apt.bmr} onChange={(e) => updateAppointment(idx, 'bmr', e.target.value)} />
                  <input className="border-r border-black p-0.5 text-center w-full text-xs" value={apt.basal} onChange={(e) => updateAppointment(idx, 'basal', e.target.value)} />
                  <input className="border-r border-black p-0.5 text-center w-full text-xs" value={apt.bone} onChange={(e) => updateAppointment(idx, 'bone', e.target.value)} />
                  <input className="p-0.5 text-center w-full text-xs" value={apt.visceral} onChange={(e) => updateAppointment(idx, 'visceral', e.target.value)} />
                </div>
              ))}

              {/* Evaluation Section */}
              <div className="mt-auto mb-[4px] text-xs">
                <table className="eval-table w-full" style={{ tableLayout: 'fixed' }}>
                  <colgroup>
                    <col style={{ width: '16.66%' }} />
                    <col style={{ width: '16.66%' }} />
                    <col style={{ width: '16.66%' }} />
                    <col style={{ width: '16.66%' }} />
                    <col style={{ width: '16.66%' }} />
                    <col style={{ width: '16.66%' }} />
                  </colgroup>
                  <tbody>
                    <tr>
                      <th className="bg-grey font-bold text-left pl-2">Evaluation</th>
                      <th className="font-normal">Excellent</th>
                      <th className="font-normal">Good</th>
                      <th className="font-normal">Medium</th>
                      <th className="font-normal">Bad</th>
                      <th className="font-normal">Alarming</th>
                    </tr>
                    {['Body Fat','Body Water','Muscle Mass','Visceral Fat','Questionnaire'].map(label => (
                      <tr key={label}>
                        <td className="bg-grey">{label}</td>
                        <td className="bg-excellent"><input type="checkbox" /></td>
                        <td className="bg-good"><input type="checkbox" /></td>
                        <td className="bg-medium"><input type="checkbox" /></td>
                        <td className="bg-bad"><input type="checkbox" /></td>
                        <td className="bg-alarming"><input type="checkbox" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right Section */}
            <div className="flex flex-col h-full">
              {/* Body Fat Range Table */}
              <div className="border-2 border-black mb-3">
                <div className="p-2 flex items-center gap-2 text-sm font-normal">
                  <img src={bodyFatRangeIcon} alt="Body fat range" className="h-9 w-9 object-contain" />
                  <span className="font-bold">Body Fat Range:</span>
                </div>
                
                <table className="w-full text-[9px] border-collapse text-center mb-2">
                  <thead>
                    <tr className="font-bold" style={{ background: '#ffff99' }}>
                      <th className="border border-black p-1" colSpan="4">Women</th>
                      <th className="border border-black p-1">AGE</th>
                      <th className="border border-black p-1" colSpan="4">Men</th>
                    </tr>
                    <tr className="text-[8px] font-medium">
                      <th className="border border-black p-1 font-normal">Excellent</th>
                      <th className="border border-black p-1 font-normal">Healthy</th>
                      <th className="border border-black p-1 font-normal">Medium</th>
                      <th className="border border-black p-1 font-normal">Obese</th>
                      <th className="border border-black p-1 font-normal" style={{ background: '#ffff99' }}></th>
                      <th className="border border-black p-1 font-normal">Excellent</th>
                      <th className="border border-black p-1 font-normal">Healthy</th>
                      <th className="border border-black p-1 font-normal">Medium</th>
                      <th className="border border-black p-1 font-normal">Obese</th>
                    </tr>
                  </thead>
                  <tbody className="font-medium">
                    <tr>
                      <td className="border border-black p-1">18.2</td>
                      <td className="border border-black p-1">22.1</td>
                      <td className="border border-black p-1">25.0</td>
                      <td className="border border-black p-1">&gt; 29.6</td>
                      <td className="border border-black p-1" style={{ background: '#ffff99' }}>20 - 24</td>
                      <td className="border border-black p-1">10.8</td>
                      <td className="border border-black p-1">14.9</td>
                      <td className="border border-black p-1">19.0</td>
                      <td className="border border-black p-1">&gt; 23.3</td>
                    </tr>
                    <tr>
                      <td className="border border-black p-1">18.9</td>
                      <td className="border border-black p-1">22.0</td>
                      <td className="border border-black p-1">25.4</td>
                      <td className="border border-black p-1">&gt; 29.8</td>
                      <td className="border border-black p-1" style={{ background: '#ffff99' }}>25 - 29</td>
                      <td className="border border-black p-1">12.8</td>
                      <td className="border border-black p-1">16.5</td>
                      <td className="border border-black p-1">20.3</td>
                      <td className="border border-black p-1">&gt; 24.3</td>
                    </tr>
                    <tr>
                      <td className="border border-black p-1">19.7</td>
                      <td className="border border-black p-1">22.7</td>
                      <td className="border border-black p-1">26.4</td>
                      <td className="border border-black p-1">&gt; 30.5</td>
                      <td className="border border-black p-1" style={{ background: '#ffff99' }}>30 - 34</td>
                      <td className="border border-black p-1">14.5</td>
                      <td className="border border-black p-1">18.0</td>
                      <td className="border border-black p-1">21.5</td>
                      <td className="border border-black p-1">&gt; 25.2</td>
                    </tr>
                    <tr>
                      <td className="border border-black p-1">21.1</td>
                      <td className="border border-black p-1">24.0</td>
                      <td className="border border-black p-1">27.7</td>
                      <td className="border border-black p-1">&gt; 31.5</td>
                      <td className="border border-black p-1" style={{ background: '#ffff99' }}>35 - 39</td>
                      <td className="border border-black p-1">16.1</td>
                      <td className="border border-black p-1">19.3</td>
                      <td className="border border-black p-1">22.6</td>
                      <td className="border border-black p-1">&gt; 26.1</td>
                    </tr>
                    <tr>
                      <td className="border border-black p-1">22.6</td>
                      <td className="border border-black p-1">25.6</td>
                      <td className="border border-black p-1">29.3</td>
                      <td className="border border-black p-1">&gt; 32.8</td>
                      <td className="border border-black p-1" style={{ background: '#ffff99' }}>40 - 44</td>
                      <td className="border border-black p-1">17.5</td>
                      <td className="border border-black p-1">20.5</td>
                      <td className="border border-black p-1">23.6</td>
                      <td className="border border-black p-1">&gt; 26.9</td>
                    </tr>
                    <tr>
                      <td className="border border-black p-1">24.3</td>
                      <td className="border border-black p-1">27.3</td>
                      <td className="border border-black p-1">30.9</td>
                      <td className="border border-black p-1">&gt; 34.1</td>
                      <td className="border border-black p-1" style={{ background: '#ffff99' }}>45 - 49</td>
                      <td className="border border-black p-1">18.6</td>
                      <td className="border border-black p-1">21.5</td>
                      <td className="border border-black p-1">24.5</td>
                      <td className="border border-black p-1">&gt; 27.6</td>
                    </tr>
                    <tr>
                      <td className="border border-black p-1">25.2</td>
                      <td className="border border-black p-1">28.2</td>
                      <td className="border border-black p-1">31.8</td>
                      <td className="border border-black p-1">&gt; 35.1</td>
                      <td className="border border-black p-1" style={{ background: '#ffff99' }}>50 - 54</td>
                      <td className="border border-black p-1">19.2</td>
                      <td className="border border-black p-1">22.1</td>
                      <td className="border border-black p-1">25.1</td>
                      <td className="border border-black p-1">&gt; 28.2</td>
                    </tr>
                    <tr>
                      <td className="border border-black p-1">26.6</td>
                      <td className="border border-black p-1">29.7</td>
                      <td className="border border-black p-1">33.1</td>
                      <td className="border border-black p-1">&gt; 36.2</td>
                      <td className="border border-black p-1" style={{ background: '#ffff99' }}>55 - 59</td>
                      <td className="border border-black p-1">19.8</td>
                      <td className="border border-black p-1">22.7</td>
                      <td className="border border-black p-1">25.6</td>
                      <td className="border border-black p-1">&gt; 28.7</td>
                    </tr>
                    <tr>
                      <td className="border border-black p-1">27.4</td>
                      <td className="border border-black p-1">30.7</td>
                      <td className="border border-black p-1">34.0</td>
                      <td className="border border-black p-1">&gt; 37.3</td>
                      <td className="border border-black p-1" style={{ background: '#ffff99' }}>60 +</td>
                      <td className="border border-black p-1">20.2</td>
                      <td className="border border-black p-1">23.3</td>
                      <td className="border border-black p-1">26.2</td>
                      <td className="border border-black p-1">&gt; 29.3</td>
                    </tr>
                  </tbody>
                </table>
                
                <div className="p-2 text-xs">
                  <p className="mb-1 leading-tight">For Sports people (measured in athletic modus) with a minimum training from 10 hours a week the Index is valid: Women 11 to 18 % / Men: 5 to 15%</p>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <p className="text-xs italic">(University of Cambridge, 1999)</p>
                    <div className="flex items-center gap-2">
                      <div className="flex flex-col items-center">
                        <span className="font-bold">-</span>
                        <span className="border border-black px-3 py-1 text-xs">Under</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="font-bold">0</span>
                        <span className="border border-black px-3 py-1 text-xs">Healthy</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="font-bold">+</span>
                        <span className="border border-black px-3 py-1 text-xs">Over</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="font-bold">++</span>
                        <span className="border border-black px-3 py-1 text-xs">Obese</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Water Index */}
              <div className="border-2 border-black mb-3">
                <div className="p-2 flex items-center gap-2 text-sm font-normal">
                  <img src={bodyWaterRangeIcon} alt="Body water range" className="h-9 w-9 object-contain" />
                  <span className="font-bold">Water Index:</span>
                </div>
                <div className="p-3 text-[10px]">
                  <div className="flex justify-between mb-1 font-semibold text-[9px] pl-[68px]">
                    <span>30%</span><span>40%</span><span>50%</span><span>60%</span><span>70%</span><span>80%</span><span>90%</span>
                  </div>
                  <div className="mb-1 text-[8px] text-[#0b2d5c] font-bold">WHO 2001</div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-[60px] font-semibold">Women</div>
                    <div className="relative h-[10px] flex-1 border border-gray-300">
                      <div
                        className="h-full w-full"
                        style={{
                          background: "repeating-linear-gradient(90deg, #99ccff, #99ccff 2px, #fff 2px, #fff 4px)"
                        }}
                      />
                      <div className="absolute top-0 h-full bg-black" style={{ left: '33.33%', width: '6.67%' }} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-[60px] font-semibold">Men</div>
                    <div className="relative h-[10px] flex-1 border border-gray-300">
                      <div
                        className="h-full w-full"
                        style={{
                          background: "repeating-linear-gradient(90deg, #99ccff, #99ccff 2px, #fff 2px, #fff 4px)"
                        }}
                      />
                      <div className="absolute top-0 h-full bg-black" style={{ left: '50%', width: '8.33%' }} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-[60px] font-semibold">Children</div>
                    <div className="relative h-[10px] flex-1 border border-gray-300">
                      <div
                        className="h-full w-full"
                        style={{
                          background: "repeating-linear-gradient(90deg, #99ccff, #99ccff 2px, #fff 2px, #fff 4px)"
                        }}
                      />
                      <div className="absolute top-0 h-full bg-black" style={{ left: '58.33%', width: '16.67%' }} />
                    </div>
                  </div>
                </div>
              </div>

                            {/* Muscle Index */}
              <div className="border-2 border-black flex-1 flex flex-col">
                <div className="p-2 flex items-center gap-2 text-sm font-normal">
                  <img src={muscleMassIcon} alt="Muscle mass" className="h-9 w-9 object-contain" />
                  <span className="font-bold">Muscle Index & Physique Ratings:</span>
                </div>
                <div className="p-3 text-xs muscle-section">
                  <p className="mb-2">The Muscle Index is given in Kg, the value belonging to it is the Physique Ratings:</p>
                  <div className="rating-box">
                    <div className="rating-columns">
                      <div className="col-red">
                        <div style={{ borderBottom: '1px solid #000', marginBottom: '2px' }}>Obese, Untrained</div>
                        1 Hidden Obese<br/>
                        2 Obese<br/>
                        <span style={{ color: '#b35a00' }}>3 Solidly-built</span>
                      </div>
                      <div className="col-green">
                        <div style={{ borderBottom: '1px solid #000', marginBottom: '2px', color: '#a00' }}>Normal</div>
                        <span style={{ color: '#e6c600' }}>4 Under Exercised</span><br/>
                        5 Standard<br/>
                        <span style={{ color: '#1f7a1f' }}>6 Standard Muscular</span>
                      </div>
                      <div className="col-black" style={{ color: '#a00' }}>
                        <div style={{ borderBottom: '1px solid #000', marginBottom: '2px' }}>Excellent</div>
                        <span style={{ color: '#1f7a1f' }}>7 Thin</span><br/>
                        <span style={{ color: '#1f7a1f' }}>8 Thin & Muscular</span><br/>
                        <span style={{ color: '#0f5a0f' }}>9 Very Muscular</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: '11px', textAlign: 'justify' }}>
                    <strong>Why is monitoring Muscle Mass important?</strong> For every extra Kg of muscle gained the body uses approximately 100 extra calories a day. Everybody who experiences a change in the muscle mass should monitor and adapt the calorie intake accordingly. Because muscle is denser than fat, monitoring your muscle mass gives you a more accurate understanding of your overall body compositions and changes in your total body weight.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Page 2 */}
      {currentPage === 2 && (
        <div className="max-w-4xl mx-auto bg-white shadow-lg page-break">
          <div className="grid grid-cols-2">
            {/* Left Column - Information */}
            <div className="p-4 text-xs leading-relaxed">
              <div className="mb-4">
                <div className="flex items-start gap-2 mb-3">
                  <img src={physiqueRatingsIcon} alt="Physique ratings" className="h-9 w-9 object-contain mt-0.5" />
                  <div>
                    <p className="font-bold mb-1">What is Physique Rating?</p>
                    <p>Offers you the opportunity to set a desired Physique Rating from which you can tailor your health/fitness programme accordingly</p>
                  </div>
                </div>

                <p className="font-bold mb-1">Why is monitoring Physique Rating important?</p>
                <p className="mb-3">When a person increases their activity level their weight may not change but their balance of body fat and muscle may alter which will change the overall physique or body shape. The physique rating helps accurately guide through a diet and fitness programme</p>

                <div className="flex items-start gap-2 mb-3">
                  <img src={basalMetabolicAgeIcon} alt="Basal metabolic rate" className="h-9 w-9 object-contain mt-0.5" />
                  <div>
                    <p className="font-bold mb-1">What is Basal Metabolic Rate Indicator?</p>
                    <p>The Basal Metabolic Rate (BMR) is the number of calories the body needs when at rest.</p>
                  </div>
                </div>

                <p className="font-bold mb-1">Why is monitoring the Basal Metabolic Rate important?</p>
                <p className="mb-3">Understanding the Basal Metabolic Rate will allow you to monitor the number of calories your body requires according to your Physique and lifestyle. The more muscle or general activity you take the more calories you require. The Basal Metabolic Rate level also decreases as the body ages</p>

                <div className="flex items-start gap-2 mb-3">
                  <img src={basalMetabolicAgeIcon} alt="Basal metabolic age" className="h-9 w-9 object-contain mt-0.5" />
                  <div>
                    <p className="font-bold mb-1">What is Metabolic Age Rating?</p>
                    <p>Basal Metabolic Rate starts to decrease after the age of 16/17 years old. Your Metabolic Age Rating indicates what age level your body is currently rated at</p>
                  </div>
                </div>

                <p className="font-bold mb-1">Why is the Metabolic Age Rating important?</p>
                <p>If the age indicated is higher than your actual age then you need to improve your Basal Metabolic Rate. Increasing exercise levels will build healthier muscle tissue which burn more calories, consequently improving your Metabolic Age Rating</p>
              </div>

              <div className="mb-4">
                <div className="flex items-start gap-2 mb-2">
                  <img src={boneMassIcon} alt="Bone mass" className="h-9 w-9 object-contain mt-0.5" />
                  <div className="font-bold">Bone Mass:</div>
                </div>
                
                <table className="w-full border-2 border-black text-xs mb-2">
                  <thead>
                    <tr className="bg-yellow-200">
                      <th className="border border-black p-1" colSpan="3">women</th>
                    </tr>
                    <tr>
                      <th className="border border-black p-1">less than 50 kg</th>
                      <th className="border border-black p-1">50 kg to 75 kg</th>
                      <th className="border border-black p-1">more than 75 kg</th>
                    </tr>
                    <tr>
                      <td className="border border-black p-1 text-center">1.95 kg</td>
                      <td className="border border-black p-1 text-center">2.4 kg</td>
                      <td className="border border-black p-1 text-center">2.95 kg</td>
                    </tr>
                    <tr className="bg-blue-900 text-white">
                      <th className="border border-black p-1" colSpan="3">men</th>
                    </tr>
                    <tr>
                      <th className="border border-black p-1">less than 65 kg</th>
                      <th className="border border-black p-1">65kg to 95 kg</th>
                      <th className="border border-black p-1">more than 95 kg</th>
                    </tr>
                    <tr>
                      <td className="border border-black p-1 text-center">2.65 kg</td>
                      <td className="border border-black p-1 text-center">3.29 kg</td>
                      <td className="border border-black p-1 text-center">3.69 kg</td>
                    </tr>
                  </thead>
                </table>
              </div>

              <div>
                <div className="flex items-start gap-2 mb-2">
                  <img src={visceralFatIcon} alt="Visceral fat" className="h-9 w-9 object-contain mt-0.5" />
                  <div className="font-bold">Visceral Fat:</div>
                </div>
                
                <div className="mb-2 text-xs">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="font-bold">1-4</span>
                      <span className="ml-4">excellent</span>
                    </div>
                    <div>
                      <span className="font-bold">5-8</span>
                      <span className="ml-4 text-gray-400">healthy</span>
                    </div>
                    <div>
                      <span className="font-bold text-red-600">9-12</span>
                      <span className="ml-4 text-red-600">bad</span>
                    </div>
                    <div>
                      <span className="font-bold text-red-600">over 13</span>
                      <span className="ml-4 text-red-600">alarming</span>
                    </div>
                  </div>
                </div>

                <p className="font-bold mb-1">What is Visceral Fat?</p>
                <p>Fat that surrounds the vital organs in the trunk/ stomach area of the body.</p>
                <p className="font-bold mb-1">Why is monitoring Visceral Fat important?</p>
                <p>High Visceral Fat levels increase the risk of high blood pressure, heart disease and type 2 diabetes. Lowering your Visceral Fat levels can stabilise insulin action substantially, reducing your risk of diabetes and other related illnesses.</p>
              </div>
            </div>

            {/* Right Column - Cover Page */}
            <div className="relative h-full">
              <div className="absolute inset-0 bg-white">
                <div className="flex flex-col h-full">
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                      <img src={wellnessLogo} alt="Herbalife logo" className="mx-auto mb-3" />
                      <h1 className="text-5xl font-bold mb-2 text-[#2f4f1f]">PERSONAL</h1>
                      <h2 className="text-6xl font-bold text-[#2f4f1f]">WELLNESS PASS</h2>
                    </div>
                  </div>
                  
                  <div className="bg-white/95 p-6 m-8">
                    <div className="mb-6">
                      <label className="block font-bold mb-2">Date:</label>
                      <div className="flex items-center gap-3">
                        <input 
                          type="text" 
                          className="flex-1 border-b-2 border-[#2f4f1f] p-2"
                          value={page2Data.date}
                          onChange={(e) => setPage2Data({...page2Data, date: e.target.value})}
                          placeholder="DD-MONTH-YYYY"
                        />
                        <button
                          type="button"
                          onClick={setTodayDate}
                          className="border-2 border-[#2f4f1f] text-[#2f4f1f] px-3 py-2 text-xs font-bold uppercase tracking-wide hover:bg-[#e7edd5]"
                        >
                          Today
                        </button>
                      </div>
                    </div>
                    
                    <div className="mb-6">
                      <label className="block font-bold mb-2">Name</label>
                      <input 
                        type="text" 
                        className="w-full border-b-2 border-[#2f4f1f] p-2"
                        value={page2Data.name}
                        onChange={(e) => setPage2Data({...page2Data, name: e.target.value})}
                      />
                    </div>
                    
                    <div className="border-2 border-[#2f4f1f] p-4 text-center">
                      <label className="block font-bold mb-2">Your Personal Wellness Coach</label>
                      <input 
                        type="text" 
                        className="w-full text-center p-2"
                        value={page2Data.coach}
                        onChange={(e) => setPage2Data({...page2Data, coach: e.target.value})}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        html, body, #root {
          height: auto;
          overflow-y: auto;
        }
        .page-break,
        .max-w-7xl,
        .max-w-4xl,
        .bg-gray-100 {
          overflow: visible;
        }
        @media print {
          .page-break {
            page-break-after: always;
          }
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  );
};


const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<WellnessForm />);
