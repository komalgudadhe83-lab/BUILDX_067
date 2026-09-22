import React, { useState } from 'react';
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  Award,
  CheckCircle2,
  Clock,
  Compass,
  FileText,
  Hospital as HospitalIcon,
  Info,
  MapPin,
  Navigation,
  Phone,
  Radio,
  ShieldAlert,
  Sparkles,
  Truck,
  User,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  calculateDistanceKm,
  estimateTravelMinutes,
  rankHospitalsForEmergency,
} from '../../utils/recommendationEngine';
import { EmergencyMap } from '../common/EmergencyMap';
import { EmergencyTimeline } from '../common/EmergencyTimeline';
import {
  Ambulance,
  AmbulanceStatus,
  EmergencyRequest,
  EmergencyRequestStatus,
  Hospital,
} from '../../types';

export const AmbulanceDashboard: React.FC = () => {
  const {
    currentUser,
    ambulances,
    hospitals,
    bloodBanks,
    emergencyRequests,
    updateAmbulanceStatus,
    assignAmbulance,
    selectDestinationHospital,
    updateEmergencyStatus,
  } = useApp();

  // Find the driver's ambulance
  const myAmbulance =
    ambulances.find((a) => a.id === currentUser.relatedEntityId) ||
    ambulances.find((a) => a.id === 'amb-101') ||
    ambulances[0];

  // Active emergency assigned to this ambulance
  const activeEmergency =
    emergencyRequests.find((e) => e.ambulanceId === myAmbulance.id && e.status !== 'COMPLETED') ||
    emergencyRequests.find((e) => e.status === 'SOS_CREATED') ||
    null;

  // Unassigned emergency requests looking for ambulance
  const pendingRequests = emergencyRequests.filter(
    (e) => e.status === 'SOS_CREATED' || e.status === 'AMBULANCE_SEARCHING'
  );

  // Status transitions
  const statusTransitions: {
    status: AmbulanceStatus;
    label: string;
    emergencyStatus: EmergencyRequestStatus;
  }[] = [
    { status: 'AVAILABLE', label: '1. Mark Available', emergencyStatus: 'SOS_CREATED' },
    { status: 'GOING_TO_PATIENT', label: '2. En Route to Patient', emergencyStatus: 'AMBULANCE_GOING_TO_PATIENT' },
    { status: 'PATIENT_PICKED_UP', label: '3. Patient Picked Up', emergencyStatus: 'PATIENT_PICKED_UP' },
    { status: 'GOING_TO_HOSPITAL', label: '4. Going to Hospital', emergencyStatus: 'GOING_TO_HOSPITAL' },
    { status: 'ARRIVED', label: '5. Arrived at Casualty', emergencyStatus: 'ARRIVED' },
    { status: 'COMPLETED', label: '6. Handover Completed', emergencyStatus: 'COMPLETED' },
  ];

  // Selected hospital for destination
  const [selectedHospitalId, setSelectedHospitalId] = useState<string | null>(
    activeEmergency?.hospitalId || null
  );

  // Recommendations calculation
  const hospitalRecommendations = activeEmergency
    ? rankHospitalsForEmergency(activeEmergency, hospitals)
    : [];

  const handleStatusChange = (status: AmbulanceStatus, reqStatus?: EmergencyRequestStatus) => {
    updateAmbulanceStatus(myAmbulance.id, status, activeEmergency?.id);
    if (activeEmergency && reqStatus) {
      updateEmergencyStatus(activeEmergency.id, reqStatus);
    }
  };

  const handleAcceptRequest = (emg: EmergencyRequest) => {
    assignAmbulance(emg.id, myAmbulance.id);
  };

  const handleConfirmHospital = (hospId: string) => {
    if (!activeEmergency) return;
    setSelectedHospitalId(hospId);
    selectDestinationHospital(activeEmergency.id, hospId);
  };

  const selectedHospital = hospitals.find(
    (h) => h.id === (selectedHospitalId || activeEmergency?.hospitalId)
  );

  return (
    <div className="space-y-6">
      {/* Driver & Vehicle Header Banner */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-slate-900 text-lg">
                  Ambulance Unit {myAmbulance.vehicleNumber}
                </span>
                <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                  {myAmbulance.type} Life Support
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Driver: <b className="text-slate-700">{myAmbulance.driverName}</b> • Phone:{' '}
                <span className="font-mono text-slate-700">{myAmbulance.phone}</span>
              </p>
            </div>
          </div>

          {/* Quick status toggle */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Current Status:</span>
            <select
              value={myAmbulance.status}
              onChange={(e) => handleStatusChange(e.target.value as AmbulanceStatus)}
              className="text-xs font-bold bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
            >
              <option value="AVAILABLE">🟢 AVAILABLE</option>
              <option value="GOING_TO_PATIENT">🟡 GOING TO PATIENT</option>
              <option value="PATIENT_PICKED_UP">🔵 PATIENT PICKED UP</option>
              <option value="GOING_TO_HOSPITAL">🟣 GOING TO HOSPITAL</option>
              <option value="ARRIVED">🏥 ARRIVED</option>
              <option value="COMPLETED">✅ COMPLETED</option>
            </select>
          </div>
        </div>
      </div>

      {/* INCOMING PENDING REQUESTS (If ambulance is available) */}
      {pendingRequests.length > 0 && (
        <div className="bg-rose-50 border-2 border-rose-500/80 rounded-3xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-600 animate-ping" />
              <h3 className="font-extrabold text-rose-900 text-sm">
                🚨 Incoming Emergency Broadcasts ({pendingRequests.length})
              </h3>
            </div>
            <span className="text-xs text-rose-700 font-semibold">Nagpur Central Dispatch</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {pendingRequests.map((req) => {
              const dist = calculateDistanceKm(
                myAmbulance.latitude,
                myAmbulance.longitude,
                req.latitude,
                req.longitude
              );
              const eta = estimateTravelMinutes(dist);

              return (
                <div
                  key={req.id}
                  className="bg-white rounded-2xl p-4 border border-rose-200 shadow-xs space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-rose-600 bg-rose-100 px-2 py-0.5 rounded">
                          {req.emergencyType.toUpperCase()}
                        </span>
                        <span className="text-xs font-mono font-bold text-slate-800">{req.id}</span>
                      </div>
                      <div className="font-bold text-slate-900 text-sm mt-1">
                        {req.patientName} ({req.patientAge ? `${req.patientAge}y` : 'Adult'})
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-rose-500" />
                        <span>{req.locationName}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-mono font-bold text-slate-800">{dist} km</div>
                      <div className="text-[10px] text-slate-500">~{eta} mins ETA</div>
                    </div>
                  </div>

                  {req.description && (
                    <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg italic">
                      "{req.description}"
                    </p>
                  )}

                  <button
                    onClick={() => handleAcceptRequest(req)}
                    className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 active:scale-98 transition text-white rounded-xl text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>ACCEPT EMERGENCY & DISPATCH SIREN</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ACTIVE EMERGENCY CONTROLS (If assigned) */}
      {activeEmergency ? (
        <div className="space-y-6">
          {/* Workflow Step Bar */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Radio className="w-4 h-4 text-amber-600" />
                Active Incident Workflow: {activeEmergency.id}
              </h3>
              <span className="text-xs font-bold bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full">
                Status: {activeEmergency.status.replace(/_/g, ' ')}
              </span>
            </div>

            {/* Step buttons for ambulance driver */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {statusTransitions.map((t) => {
                const isCurrent =
                  myAmbulance.status === t.status || activeEmergency.status === t.emergencyStatus;

                return (
                  <button
                    key={t.status}
                    type="button"
                    onClick={() => handleStatusChange(t.status, t.emergencyStatus)}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition text-center cursor-pointer ${
                      isCurrent
                        ? 'bg-amber-600 text-white border-amber-600 shadow-xs ring-2 ring-amber-200'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* SMART HOSPITAL RECOMMENDATION ENGINE (Requirement 7) */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <h3 className="font-extrabold text-slate-900 text-base">
                    Smart Hospital Recommendation Engine
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Intelligent scoring based on bed readiness, specialist on duty, trauma capacity & transit ETA.
                </p>
              </div>

              <div className="text-[11px] bg-blue-50 text-blue-800 px-3 py-1 rounded-full border border-blue-200 font-medium">
                Prototype Algorithm • Not Medical Advice
              </div>
            </div>

            {/* Hospital Comparison Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {hospitalRecommendations.slice(0, 3).map((rec, index) => {
                const isSelected = (selectedHospitalId || activeEmergency.hospitalId) === rec.hospital.id;
                const isTopRanked = index === 0;

                const suitabilityBg =
                  rec.suitability === 'SUITABLE'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                    : rec.suitability === 'PARTIALLY_SUITABLE'
                    ? 'bg-amber-50 border-amber-300 text-amber-900'
                    : 'bg-rose-50 border-rose-300 text-rose-900';

                const badgeColor =
                  rec.suitability === 'SUITABLE'
                    ? 'bg-emerald-600 text-white'
                    : rec.suitability === 'PARTIALLY_SUITABLE'
                    ? 'bg-amber-600 text-white'
                    : 'bg-rose-600 text-white';

                return (
                  <div
                    key={rec.hospital.id}
                    className={`rounded-2xl border-2 p-4 flex flex-col justify-between transition ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/40 ring-2 ring-blue-200 shadow-md'
                        : isTopRanked
                        ? 'border-emerald-400 bg-emerald-50/20'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          {isTopRanked && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full mb-1">
                              <Award className="w-3 h-3" /> Top Recommendation
                            </span>
                          )}
                          <h4 className="font-extrabold text-slate-900 text-sm">
                            {rec.hospital.name}
                          </h4>
                          <p className="text-[11px] text-slate-500 line-clamp-1">
                            {rec.hospital.address}
                          </p>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-xl font-black text-slate-900">
                            {rec.score}
                            <span className="text-xs font-normal text-slate-400">/100</span>
                          </div>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${badgeColor}`}>
                            {rec.suitability.replace(/_/g, ' ')}
                          </span>
                        </div>
                      </div>

                      {/* Distance & ETA */}
                      <div className="grid grid-cols-2 gap-2 text-center bg-white p-2 rounded-xl border border-slate-100 text-xs">
                        <div>
                          <div className="text-[10px] text-slate-400 font-medium">Distance</div>
                          <div className="font-bold text-slate-800">{rec.distanceKm} km</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-400 font-medium">Transit ETA</div>
                          <div className="font-bold text-slate-800">~{rec.estimatedTravelMinutes} mins</div>
                        </div>
                      </div>

                      {/* Capacity metrics */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div
                          className={`p-2 rounded-xl text-center ${
                            rec.hospital.icuBeds > 0
                              ? 'bg-emerald-50 text-emerald-900'
                              : 'bg-rose-50 text-rose-900 font-bold'
                          }`}
                        >
                          <div className="text-[10px] uppercase">ICU Beds</div>
                          <div className="font-extrabold text-base">{rec.hospital.icuBeds}</div>
                        </div>
                        <div className="p-2 rounded-xl text-center bg-slate-50 text-slate-800">
                          <div className="text-[10px] uppercase">ER Beds</div>
                          <div className="font-extrabold text-base">
                            {rec.hospital.emergencyBeds}
                          </div>
                        </div>
                      </div>

                      {/* Transparent Reasons Breakdown */}
                      <div className="space-y-1">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Why Recommended:
                        </div>
                        <ul className="space-y-1 text-[11px] text-slate-600">
                          {rec.reasons.map((r, rIdx) => (
                            <li key={rIdx} className="flex items-start gap-1.5">
                              <span className="text-emerald-600 font-bold">✓</span>
                              <span>{r}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Hospital Selection Button */}
                    <div className="pt-4 mt-2 border-t border-slate-100">
                      {isSelected ? (
                        <div className="w-full py-2 bg-blue-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Destination Confirmed</span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleConfirmHospital(rec.hospital.id)}
                          className="w-full py-2 bg-slate-900 hover:bg-blue-600 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <span>Select This Destination</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Interactive Map with Patient & Hospital */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-rose-600" />
              Live Navigation Route
            </h4>
            <EmergencyMap
              emergencies={[activeEmergency]}
              ambulances={[myAmbulance]}
              hospitals={selectedHospital ? [selectedHospital] : hospitals}
              selectedEmergencyId={activeEmergency.id}
              heightClass="h-[380px]"
            />
          </div>

          {/* Timeline */}
          <EmergencyTimeline
            emergency={activeEmergency}
            hospital={selectedHospital}
            ambulance={myAmbulance}
            canAdvance={true}
            onAdvanceStatus={(next) => updateEmergencyStatus(activeEmergency.id, next)}
          />
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-500 space-y-3">
          <Truck className="w-12 h-12 mx-auto text-slate-300" />
          <h3 className="font-extrabold text-slate-800 text-base">
            Ambulance {myAmbulance.vehicleNumber} on Standby
          </h3>
          <p className="text-xs max-w-md mx-auto">
            You are currently marked as available. When an Emergency SOS is broadcasted across Nagpur, it will appear here with instant dispatch details.
          </p>
        </div>
      )}
    </div>
  );
};
