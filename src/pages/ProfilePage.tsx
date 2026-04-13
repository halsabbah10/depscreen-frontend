/**
 * ProfilePage — Patient & clinician profile management.
 *
 * Clinical Sanctuary: warm, editorial, comprehensive.
 * Tabbed layout: Overview / Medical / Contacts / Settings
 *
 * Patients see: demographics, medical info, emergency contacts, preferences.
 * Clinicians see: practice info, clinician code.
 */

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  User, Shield, Download, AlertTriangle, Heart, Pill,
  FileText, Phone, Camera,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { patient as patientApi } from '../api/client'
import type {
  MedicationResponse, AllergyResponse, DiagnosisResponse,
  EmergencyContact, ProfileUpdate,
} from '../types/api'
import { BreathingCircle } from '../components/ui/BreathingCircle'
import { PageTransition } from '../components/ui/PageTransition'

type Tab = 'overview' | 'medical' | 'contacts' | 'settings'

export function ProfilePage() {
  const { user, logout, isPatient, isClinician, refreshUser } = useAuth()
  const [tab, setTab] = useState<Tab>('overview')
  const [saving, setSaving] = useState(false)

  // Profile form
  const [fullName, setFullName] = useState(user?.full_name || '')
  const [phone, setPhone] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [gender, setGender] = useState('')
  const [nationality, setNationality] = useState('')
  const [cprNumber, setCprNumber] = useState('')
  const [bloodType, setBloodType] = useState('')
  const [newPassword, setNewPassword] = useState('')

  // Medical data
  const [medications, setMedications] = useState<MedicationResponse[]>([])
  const [allergies, setAllergies] = useState<AllergyResponse[]>([])
  const [diagnoses, setDiagnoses] = useState<DiagnosisResponse[]>([])
  const [contacts, setContacts] = useState<EmergencyContact[]>([])
  const [medicalLoading, setMedicalLoading] = useState(false)

  // New medication form
  const [newMedName, setNewMedName] = useState('')
  const [newMedDosage, setNewMedDosage] = useState('')
  const [newMedFreq] = useState('daily')

  // New allergy form
  const [newAllergen, setNewAllergen] = useState('')
  const [newAllergySeverity] = useState('moderate')

  // New contact form
  const [newContactName, setNewContactName] = useState('')
  const [newContactPhone, setNewContactPhone] = useState('')
  const [newContactRelation] = useState('parent')

  useEffect(() => {
    if (tab === 'medical' && isPatient) {
      setMedicalLoading(true)
      Promise.all([
        patientApi.getMedications().then(setMedications).catch(() => []),
        patientApi.getAllergies().then(setAllergies).catch(() => []),
        patientApi.getDiagnoses().then(setDiagnoses).catch(() => []),
      ]).finally(() => setMedicalLoading(false))
    }
    if (tab === 'contacts' && isPatient) {
      patientApi.getEmergencyContacts().then(setContacts).catch(() => [])
    }
  }, [tab, isPatient])

  const handleSaveProfile = async () => {
    setSaving(true)
    try {
      const data: ProfileUpdate = {}
      if (fullName !== user?.full_name) data.full_name = fullName
      if (phone) data.phone = phone
      if (dateOfBirth) data.date_of_birth = dateOfBirth
      if (gender) data.gender = gender
      if (nationality) data.nationality = nationality
      if (cprNumber) data.cpr_number = cprNumber
      if (bloodType) data.blood_type = bloodType
      if (newPassword) data.new_password = newPassword

      await patientApi.updateProfile(data)
      toast.success('Profile updated successfully.')
      setNewPassword('')
      await refreshUser()
    } catch (err: unknown) {
      const errorDetail = err instanceof Object && 'detail' in err ? (err as { detail: string }).detail : null
      toast.error(errorDetail || 'Could not update profile. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleAddMedication = async () => {
    if (!newMedName.trim()) return
    try {
      const med = await patientApi.addMedication({
        name: newMedName, dosage: newMedDosage, frequency: newMedFreq,
      })
      setMedications(prev => [med, ...prev])
      setNewMedName('')
      setNewMedDosage('')
      toast.success('Medication added.')
    } catch (err: unknown) {
      const errorDetail = err instanceof Object && 'detail' in err ? (err as { detail: string }).detail : null
      toast.error(errorDetail || 'Could not add medication.')
    }
  }

  const handleAddAllergy = async () => {
    if (!newAllergen.trim()) return
    try {
      const allergy = await patientApi.addAllergy({
        allergen: newAllergen, severity: newAllergySeverity, allergy_type: 'medication',
      })
      setAllergies(prev => [allergy, ...prev])
      setNewAllergen('')
      toast.success('Allergy recorded.')
    } catch (err: unknown) {
      const errorDetail = err instanceof Object && 'detail' in err ? (err as { detail: string }).detail : null
      toast.error(errorDetail || 'Could not add allergy.')
    }
  }

  const handleAddContact = async () => {
    if (!newContactName.trim() || !newContactPhone.trim()) return
    try {
      const result = await patientApi.addEmergencyContact({
        contact_name: newContactName,
        phone: newContactPhone,
        relation: newContactRelation,
        is_primary: contacts.length === 0,
      })
      setContacts(prev => [...prev, { ...result, id: result.contact_id } as unknown as EmergencyContact])
      setNewContactName('')
      setNewContactPhone('')
      toast.success('Emergency contact added.')
    } catch (err: unknown) {
      const errorDetail = err instanceof Object && 'detail' in err ? (err as { detail: string }).detail : null
      toast.error(errorDetail || 'Could not add contact.')
    }
  }

  const handleExport = async () => {
    try {
      const data = await patientApi.exportData()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `depscreen-export-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Data exported successfully.')
    } catch {
      toast.error('Export failed. Please try again.')
    }
  }

  const tabs: { id: Tab; label: string; icon: typeof User }[] = isPatient
    ? [
        { id: 'overview', label: 'Overview', icon: User },
        { id: 'medical', label: 'Medical', icon: Heart },
        { id: 'contacts', label: 'Contacts', icon: Phone },
        { id: 'settings', label: 'Settings', icon: Shield },
      ]
    : [
        { id: 'overview', label: 'Overview', icon: User },
        { id: 'settings', label: 'Settings', icon: Shield },
      ]

  return (
    <PageTransition>
      <div className="max-w-2xl mx-auto">
        <h1 className="font-display text-2xl text-foreground mb-6">Profile</h1>

        {/* User card */}
        <div className="card-warm p-5 flex items-center gap-4 mb-6">
          <div className="relative">
            {user?.profile_picture_url ? (
              <img src={user.profile_picture_url} alt="" className="w-14 h-14 rounded-full object-cover" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="font-display text-xl text-primary">
                  {user?.full_name?.charAt(0)?.toUpperCase() || '?'}
                </span>
              </div>
            )}
            {isPatient && (
              <label className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-background border border-border flex items-center justify-center cursor-pointer hover:bg-muted transition-colors">
                <Camera className="w-3 h-3 text-muted-foreground" />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    try {
                      await patientApi.uploadProfilePicture(file)
                      toast.success('Photo updated.')
                      await refreshUser()
                    } catch {
                      toast.error('Could not upload photo.')
                    }
                  }}
                />
              </label>
            )}
          </div>
          <div className="flex-1">
            <p className="font-display text-lg text-foreground">{user?.full_name}</p>
            <p className="text-sm text-muted-foreground font-body">{user?.email}</p>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full bg-muted text-muted-foreground font-body capitalize">
            {user?.role}
          </span>
        </div>

        {/* Clinician code */}
        {isClinician && user?.clinician_code && (
          <div className="card-warm p-4 mb-6">
            <p className="text-xs text-muted-foreground font-body mb-1">Your Clinician Code</p>
            <p className="font-mono text-2xl font-bold tracking-[0.3em] text-primary">
              {user.clinician_code}
            </p>
            <p className="text-xs text-muted-foreground font-body mt-1">
              Share this with patients so they can link to you.
            </p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-muted rounded-lg mb-6">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium font-body rounded-md transition-all duration-200 ${
                tab === t.id ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Overview tab */}
          {tab === 'overview' && (
            <div className="space-y-4">
              <div className="card-warm p-5 space-y-4">
                <h3 className="font-display text-lg text-foreground">Personal Information</h3>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1 font-body">Full Name</label>
                    <input type="text" className="input" value={fullName} onChange={e => setFullName(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1 font-body">Date of Birth</label>
                    <input type="date" className="input" value={dateOfBirth} onChange={e => setDateOfBirth(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1 font-body">Gender</label>
                    <div className="flex gap-2">
                      {['male', 'female', 'prefer_not_to_say'].map(g => (
                        <button
                          key={g}
                          onClick={() => setGender(g)}
                          className={`flex-1 py-2 text-xs rounded-md border transition-colors font-body capitalize ${
                            gender === g ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground'
                          }`}
                        >
                          {g.replace(/_/g, ' ')}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1 font-body">Phone (+973)</label>
                    <input type="tel" className="input" placeholder="3XXX XXXX" value={phone} onChange={e => setPhone(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1 font-body">CPR Number</label>
                    <input type="text" className="input font-mono" placeholder="YYMMNNNNC" maxLength={9} value={cprNumber} onChange={e => setCprNumber(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1 font-body">Blood Type</label>
                    <div className="grid grid-cols-4 gap-1">
                      {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bt => (
                        <button
                          key={bt}
                          onClick={() => setBloodType(bt)}
                          className={`py-1.5 text-xs rounded border transition-colors font-body ${
                            bloodType === bt ? 'border-primary bg-primary/5 text-primary font-medium' : 'border-border text-muted-foreground'
                          }`}
                        >
                          {bt}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1 font-body">Nationality</label>
                    <input type="text" className="input" placeholder="Bahraini" value={nationality} onChange={e => setNationality(e.target.value)} />
                  </div>
                </div>

                <button onClick={handleSaveProfile} disabled={saving} className="btn-primary w-full mt-2">
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          )}

          {/* Medical tab */}
          {tab === 'medical' && isPatient && (
            <div className="space-y-6">
              {medicalLoading ? (
                <BreathingCircle size="sm" label="Loading medical info..." />
              ) : (
                <>
                  {/* Medications */}
                  <div className="card-warm p-5">
                    <h3 className="font-display text-lg text-foreground mb-3 flex items-center gap-2">
                      <Pill className="w-4 h-4 text-primary" /> Medications
                    </h3>
                    {medications.length === 0 ? (
                      <p className="text-sm text-muted-foreground font-body">No medications recorded.</p>
                    ) : (
                      <div className="space-y-2 mb-4">
                        {medications.map(m => (
                          <div key={m.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                            <div>
                              <span className="text-sm font-medium font-body">{m.name}</span>
                              {m.dosage && <span className="text-xs text-muted-foreground ml-2 font-body">{m.dosage}</span>}
                              {m.frequency && <span className="text-xs text-muted-foreground ml-1 font-body">· {m.frequency}</span>}
                            </div>
                            <button
                              onClick={async () => {
                                await patientApi.deleteMedication(m.id)
                                setMedications(prev => prev.filter(x => x.id !== m.id))
                                toast.success('Medication removed.')
                              }}
                              className="text-xs text-muted-foreground hover:text-destructive transition-colors font-body"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2 mt-3">
                      <input className="input flex-1" placeholder="Medication name" value={newMedName} onChange={e => setNewMedName(e.target.value)} />
                      <input className="input w-20" placeholder="Dosage" value={newMedDosage} onChange={e => setNewMedDosage(e.target.value)} />
                      <button onClick={handleAddMedication} disabled={!newMedName.trim()} className="btn-outline text-xs">Add</button>
                    </div>
                  </div>

                  {/* Allergies */}
                  <div className="card-warm p-5">
                    <h3 className="font-display text-lg text-foreground mb-3 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-clay" /> Allergies
                    </h3>
                    {allergies.length === 0 ? (
                      <p className="text-sm text-muted-foreground font-body">No allergies recorded.</p>
                    ) : (
                      <div className="space-y-2 mb-4">
                        {allergies.map(a => (
                          <div key={a.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                            <div>
                              <span className="text-sm font-medium font-body">{a.allergen}</span>
                              {a.severity && (
                                <span className={`text-xs ml-2 px-1.5 py-0.5 rounded font-body ${
                                  a.severity === 'life_threatening' ? 'bg-red-50 text-red-700' :
                                  a.severity === 'severe' ? 'bg-amber-50 text-amber-700' :
                                  'bg-muted text-muted-foreground'
                                }`}>{a.severity}</span>
                              )}
                            </div>
                            <button
                              onClick={async () => {
                                await patientApi.deleteAllergy(a.id)
                                setAllergies(prev => prev.filter(x => x.id !== a.id))
                                toast.success('Allergy removed.')
                              }}
                              className="text-xs text-muted-foreground hover:text-destructive transition-colors font-body"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2 mt-3">
                      <input className="input flex-1" placeholder="Allergen" value={newAllergen} onChange={e => setNewAllergen(e.target.value)} />
                      <button onClick={handleAddAllergy} disabled={!newAllergen.trim()} className="btn-outline text-xs">Add</button>
                    </div>
                  </div>

                  {/* Diagnoses (read-only for patients) */}
                  <div className="card-warm p-5">
                    <h3 className="font-display text-lg text-foreground mb-3 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary" /> Diagnoses
                    </h3>
                    {diagnoses.length === 0 ? (
                      <p className="text-sm text-muted-foreground font-body">No diagnoses on record. Your clinician can add these.</p>
                    ) : (
                      <div className="space-y-2">
                        {diagnoses.map(d => (
                          <div key={d.id} className="py-2 border-b border-border last:border-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium font-body">{d.condition}</span>
                              {d.icd10_code && <span className="text-xs text-muted-foreground font-mono">{d.icd10_code}</span>}
                              <span className={`text-xs px-1.5 py-0.5 rounded font-body ${
                                d.status === 'active' ? 'bg-amber-50 text-amber-700' :
                                d.status === 'remission' ? 'bg-sky-50 text-sky-700' :
                                'bg-emerald-50 text-emerald-700'
                              }`}>{d.status}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Contacts tab */}
          {tab === 'contacts' && isPatient && (
            <div className="card-warm p-5">
              <h3 className="font-display text-lg text-foreground mb-3 flex items-center gap-2">
                <Phone className="w-4 h-4 text-primary" /> Emergency Contacts
              </h3>
              <p className="text-xs text-muted-foreground font-body mb-4">
                These contacts may be shown during crisis situations to help you reach support quickly.
              </p>

              {contacts.length === 0 ? (
                <p className="text-sm text-muted-foreground font-body mb-4">No emergency contacts yet. Adding at least one is recommended.</p>
              ) : (
                <div className="space-y-2 mb-4">
                  {contacts.map(c => (
                    <div key={c.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <div>
                        <span className="text-sm font-medium font-body">{c.contact_name}</span>
                        <span className="text-xs text-muted-foreground ml-2 font-body">{c.relation}</span>
                        <span className="text-xs text-muted-foreground ml-2 font-body">{c.phone}</span>
                        {c.is_primary && <span className="text-xs text-primary ml-2 font-body">Primary</span>}
                      </div>
                      <button
                        onClick={async () => {
                          await patientApi.removeEmergencyContact(c.id)
                          setContacts(prev => prev.filter(x => x.id !== c.id))
                          toast.success('Contact removed.')
                        }}
                        className="text-xs text-muted-foreground hover:text-destructive transition-colors font-body"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2 mt-3">
                <input className="input flex-1" placeholder="Contact name" value={newContactName} onChange={e => setNewContactName(e.target.value)} />
                <input className="input w-28" placeholder="+973 XXXX" value={newContactPhone} onChange={e => setNewContactPhone(e.target.value)} />
                <button onClick={handleAddContact} disabled={!newContactName.trim() || !newContactPhone.trim()} className="btn-outline text-xs">Add</button>
              </div>
            </div>
          )}

          {/* Settings tab */}
          {tab === 'settings' && (
            <div className="space-y-4">
              <div className="card-warm p-5">
                <h3 className="font-display text-lg text-foreground mb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary" /> Security
                </h3>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1 font-body">New Password</label>
                  <input type="password" className="input" placeholder="Min 8 characters" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                </div>
                <button onClick={handleSaveProfile} disabled={saving || !newPassword} className="btn-primary w-full mt-3">
                  {saving ? 'Saving...' : 'Update Password'}
                </button>
              </div>

              {isPatient && (
                <>
                  <div className="card-warm p-5">
                    <h3 className="font-display text-lg text-foreground mb-2 flex items-center gap-2">
                      <Download className="w-4 h-4 text-primary" /> Export Your Data
                    </h3>
                    <p className="text-sm text-muted-foreground font-body mb-3">
                      Download all your screenings, chat history, documents, and profile as JSON.
                    </p>
                    <button onClick={handleExport} className="btn-outline w-full">
                      <Download className="w-4 h-4" /> Download My Data
                    </button>
                  </div>

                  <div className="card p-5 border-destructive/20">
                    <h3 className="font-display text-lg text-destructive mb-2 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" /> Danger Zone
                    </h3>
                    <p className="text-sm text-muted-foreground font-body mb-3">
                      Deactivating your account will prevent future logins. Your data will be preserved for your clinician's records.
                    </p>
                    <button
                      onClick={async () => {
                        if (confirm('Are you sure you want to deactivate your account? This action cannot be easily undone.')) {
                          await patientApi.deactivateAccount()
                          toast.success('Account deactivated.')
                          logout()
                        }
                      }}
                      className="btn-destructive w-full"
                    >
                      Deactivate Account
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </PageTransition>
  )
}
