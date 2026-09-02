import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, X, Check } from 'lucide-react';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

interface PoliciesModalProps {
  isOpen: boolean;
  mode: 'enforce' | 'view';
  defaultTab?: 'terms' | 'privacy' | 'cookies' | 'refund';
  onClose?: () => void;
  onAccept?: () => void;
}

export default function PoliciesModal({ isOpen, mode, defaultTab = 'terms', onClose, onAccept }: PoliciesModalProps) {
  const [activeTab, setActiveTab] = useState<'terms' | 'privacy' | 'cookies' | 'refund'>(defaultTab);

  React.useEffect(() => {
    if (isOpen) {
      setActiveTab(defaultTab);
    }
  }, [isOpen, defaultTab]);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const { user } = useAuth();

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight + 50) {
      setHasScrolledToBottom(true);
    }
  };

  const handleAccept = async () => {
    if (mode === 'enforce') {
      if (user) {
        // Store in localStorage
        try {
          localStorage.setItem(`auralis_terms_accepted_${user.id}`, 'true');
        } catch {}
        
        // Also try to update user metadata
        try {
          await supabase.auth.updateUser({
            data: { accepted_terms: true }
          });
        } catch (e) {
          console.error('Failed to update user metadata', e);
        }
      }
      if (onAccept) onAccept();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          onClick={mode === 'view' ? onClose : undefined}
        />
        <motion.div 
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className="relative w-full max-w-4xl bg-[#111] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[85vh]"
        >
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-6 border-b border-white/10 gap-4 shrink-0 bg-[#111] z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#6B46C1]/20 flex items-center justify-center border border-[#6B46C1]/30">
                <Shield className="text-[#6B46C1]" size={20} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Legal & Policies</h2>
                <p className="text-sm text-gray-300">Please review our Terms and Privacy Policy</p>
              </div>
            </div>
            
            
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto bg-[#1A1A1A] p-1 rounded-xl border border-white/5 overflow-x-auto">
              <button
                onClick={() => setActiveTab('terms')}
                className={cn(
                  "flex-none px-3 py-1.5 rounded-lg text-xs md:text-sm font-medium transition-all whitespace-nowrap",
                  activeTab === 'terms' 
                    ? "bg-white/10 text-white shadow-sm" 
                    : "text-gray-400 hover:text-gray-200 hover:bg-white/5"
                )}
              >
                Terms of Use
              </button>
              <button
                onClick={() => setActiveTab('privacy')}
                className={cn(
                  "flex-none px-3 py-1.5 rounded-lg text-xs md:text-sm font-medium transition-all whitespace-nowrap",
                  activeTab === 'privacy' 
                    ? "bg-white/10 text-white shadow-sm" 
                    : "text-gray-400 hover:text-gray-200 hover:bg-white/5"
                )}
              >
                Privacy Policy
              </button>
              <button
                onClick={() => setActiveTab('cookies')}
                className={cn(
                  "flex-none px-3 py-1.5 rounded-lg text-xs md:text-sm font-medium transition-all whitespace-nowrap",
                  activeTab === 'cookies' 
                    ? "bg-white/10 text-white shadow-sm" 
                    : "text-gray-400 hover:text-gray-200 hover:bg-white/5"
                )}
              >
                Cookie Policy
              </button>
              <button
                onClick={() => setActiveTab('refund')}
                className={cn(
                  "flex-none px-3 py-1.5 rounded-lg text-xs md:text-sm font-medium transition-all whitespace-nowrap",
                  activeTab === 'refund' 
                    ? "bg-white/10 text-white shadow-sm" 
                    : "text-gray-400 hover:text-gray-200 hover:bg-white/5"
                )}
              >
                Refund Policy
              </button>
            </div>
            {mode === 'view' && (
              <button 
                onClick={onClose}
                className="absolute top-6 right-6 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 p-2 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            )}
          </div>

          {/* Content Area */}
          <div 
            className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar bg-[#0A0A0A]"
            onScroll={handleScroll}
          >
            <div className="max-w-3xl mx-auto text-gray-300 space-y-4 [&_h3]:text-gray-200 [&_h4]:text-gray-200 [&_h3]:text-2xl [&_h4]:text-lg [&_h3]:font-bold [&_h4]:font-bold [&_p]:mb-4 [&_ul]:mb-4 [&_ol]:mb-4">
              
              {activeTab === 'terms' && (

                <div className="space-y-6">
                  <div>
                    <h3 className="text-2xl font-bold text-white mb-2">Terms of Use</h3>
                    <p className="text-sm text-gray-500">Effective Date: July 19, 2026</p>
                  </div>
                  
                  <p>Welcome to Auralis, an AI-powered video captioning and editing platform operated by Decipher ("Auralis", "we", "our", or "us").</p>
                  <p>By accessing or using Auralis, you agree to these Terms of Use. If you do not agree, please do not use Auralis.</p>

                  <h4 className="text-lg font-bold text-white mt-8 mb-4">1. Eligibility</h4>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>You must be at least 13 years old to use Auralis.</li>
                    <li>If you are under 18 years of age, you must have permission from your parent or legal guardian to use Auralis and purchase any paid services.</li>
                  </ul>

                  <h4 className="text-lg font-bold text-white mt-8 mb-4">2. Your Account</h4>
                  <p>To use Auralis, you must create an account using email verification (OTP).</p>
                  <p>You are responsible for:</p>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>Keeping your account secure.</li>
                    <li>Maintaining accurate account information.</li>
                    <li>All activities that occur under your account.</li>
                  </ul>
                  <p>Do not share your account with others.</p>

                  <h4 className="text-lg font-bold text-white mt-8 mb-4">3. Acceptable Use</h4>
                  <p>You agree to use Auralis responsibly and legally.</p>
                  <p>You must not:</p>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>Upload illegal or harmful content.</li>
                    <li>Infringe another person's copyright or intellectual property.</li>
                    <li>Upload malware or malicious code.</li>
                    <li>Attempt to gain unauthorized access to Auralis or other user accounts.</li>
                    <li>Reverse engineer, copy, or reproduce Auralis's software, caption styles, templates, animations, algorithms, or proprietary technology.</li>
                    <li>Use Auralis to spam, harass, or abuse others.</li>
                    <li>Interfere with the operation or security of the Service.</li>
                  </ul>
                  <p>Violation of these rules may result in suspension or permanent termination of your account.</p>

                  <h4 className="text-lg font-bold text-white mt-8 mb-4">4. Your Content</h4>
                  <p>You retain ownership of the videos, audio, images, subtitles, and other content you upload.</p>
                  <p>By uploading content, you grant Auralis a limited license to process your content solely for providing the requested services, including AI processing, caption generation, editing, rendering, exporting, storage, and related functionality.</p>
                  <p>You are responsible for ensuring that you have the necessary rights to upload and use your content.</p>

                  <h4 className="text-lg font-bold text-white mt-8 mb-4">5. AI Features</h4>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>Auralis uses artificial intelligence to generate captions, subtitles, translations, and other editing features.</li>
                    <li>AI-generated results may contain mistakes or inaccuracies.</li>
                    <li>You are responsible for reviewing all AI-generated content before publishing or relying on it.</li>
                  </ul>

                  <h4 className="text-lg font-bold text-white mt-8 mb-4">6. Payments, Credits, and Refunds</h4>
                  <p>Certain features require paid subscriptions or credits.</p>
                  <p>Payments are securely processed by payment providers.</p>
                  <p>Refund requests:</p>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>Must be submitted through Auralis's in-app Feedback or Support feature.</li>
                    <li>Must generally be requested within 7 days of purchase.</li>
                    <li>Are normally available only if purchased credits have not been used.</li>
                    <li>May be approved for duplicate payments or verified technical issues, subject to review.</li>
                  </ul>
                  <p>Refund requests are evaluated individually.</p>

                  <h4 className="text-lg font-bold text-white mt-8 mb-4">7. Intellectual Property</h4>
                  <p>Auralis and all associated software, branding, logos, interface designs, caption styles, templates, animations, visual effects, and proprietary technology are owned by Decipher or its licensors and are protected by applicable intellectual property laws.</p>
                  <p>You may not copy, modify, distribute, sell, reverse engineer, or create competing products based on Auralis or its proprietary technology without prior written permission.</p>

                  <h4 className="text-lg font-bold text-white mt-8 mb-4">8. Availability of the Service</h4>
                  <p>We work to keep Auralis available and reliable, but we do not guarantee uninterrupted or error-free service.</p>
                  <p>We may update, modify, suspend, or discontinue features at any time to improve or maintain the platform.</p>

                  <h4 className="text-lg font-bold text-white mt-8 mb-4">9. Suspension and Termination</h4>
                  <p>We reserve the right to suspend or terminate accounts that:</p>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>Violate these Terms of Use.</li>
                    <li>Abuse Auralis's services.</li>
                    <li>Engage in fraud or unauthorized activity.</li>
                    <li>Infringe intellectual property rights.</li>
                    <li>Harm Auralis, its users, or its infrastructure.</li>
                  </ul>

                  <h4 className="text-lg font-bold text-white mt-8 mb-4">10. Limitation of Liability</h4>
                  <p>To the maximum extent permitted by applicable law, Auralis and Decipher are not liable for indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, or business opportunities arising from your use of the Service.</p>
                  <p>Nothing in these Terms excludes liability that cannot legally be excluded under applicable law.</p>

                  <h4 className="text-lg font-bold text-white mt-8 mb-4">11. Changes to These Terms</h4>
                  <p>We may update these Terms of Use from time to time.</p>
                  <p>The updated version will become effective on the date it is published.</p>
                  <p>Continued use of Auralis after changes become effective constitutes acceptance of the revised Terms.</p>

                  <h4 className="text-lg font-bold text-white mt-8 mb-4">12. Governing Law</h4>
                  <p>These Terms of Use are governed by the laws of India.</p>
                  <p>Any disputes relating to these Terms shall be subject to the jurisdiction of the competent courts of India, unless applicable law provides otherwise.</p>

                  <h4 className="text-lg font-bold text-white mt-8 mb-4">13. Contact</h4>
                  <p>For support, refund requests, legal notices, or questions regarding these Terms of Use, please use the in-app Feedback or Support feature available within Auralis.</p>
                  <br/>
                  <p className="font-medium text-white pb-8">By using Auralis, you confirm that you have read, understood, and agree to these Terms of Use.</p>
                </div>

              )}
              {activeTab === 'privacy' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-2xl font-bold text-white mb-2">Privacy Policy</h3>
                    <p className="text-sm text-gray-500">Effective Date: July 19, 2026</p>
                  </div>

                  <p>Welcome to Auralis ("Auralis", "we", "our", or "us"). Auralis is operated by Decipher, an independent software business based in India.</p>
                  <p>This Privacy Policy explains how we collect, use, store, share, and protect your personal information when you use Auralis and its related services.</p>
                  <p>By creating an account or using Auralis, you agree to the practices described in this Privacy Policy.</p>

                  <h4 className="text-lg font-bold text-white mt-8 mb-4">1. Who We Are</h4>
                  <p>Auralis is an AI-powered video captioning and editing platform operated by Decipher, based in India.</p>
                  <p>Auralis enables users to upload videos, generate AI-powered captions and subtitles, edit captions, and export finished videos.</p>

                  <h4 className="text-lg font-bold text-white mt-8 mb-4">2. Information We Collect</h4>
                  <p className="font-medium text-gray-300">Information You Provide</p>
                  <p>When you use Auralis, we may collect information that you voluntarily provide, including:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Email address</li>
                    <li>Email verification (OTP) information</li>
                    <li>Videos</li>
                    <li>Audio files</li>
                    <li>Images</li>
                    <li>Subtitle files</li>
                    <li>Project files</li>
                    <li>Caption edits</li>
                    <li>Feedback submitted through the in-app Feedback or Support feature</li>
                    <li>Information you provide while requesting refunds or customer support</li>
                  </ul>

                  <p className="font-medium text-gray-300 mt-6">Information Collected Automatically</p>
                  <p>When you access Auralis, we may automatically collect technical information such as:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>IP address</li>
                    <li>Device information</li>
                    <li>Browser type</li>
                    <li>Operating system</li>
                    <li>Language preferences</li>
                    <li>Time zone</li>
                    <li>App version</li>
                    <li>Usage logs</li>
                    <li>Crash reports</li>
                    <li>Error logs</li>
                    <li>Performance information</li>
                    <li>General analytics about how Auralis is used</li>
                  </ul>
                  <p>This information helps us improve the security, stability, and performance of our services.</p>

                  <p className="font-medium text-gray-300 mt-6">Payment Information</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Payments made within Auralis are securely processed.</li>
                    <li>Auralis does not store your complete debit card, credit card, UPI, banking, or other payment credentials.</li>
                  </ul>

                  <h4 className="text-lg font-bold text-white mt-8 mb-4">3. How We Use Your Information</h4>
                  <p>We use your information to:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Create and manage your account</li>
                    <li>Verify your email address using OTP</li>
                    <li>Authenticate your identity</li>
                    <li>Process uploaded media</li>
                    <li>Generate captions and subtitles</li>
                    <li>Process AI-powered editing features</li>
                    <li>Export videos</li>
                    <li>Deliver purchased services</li>
                    <li>Process subscriptions</li>
                    <li>Manage credits</li>
                    <li>Review refund requests</li>
                    <li>Respond to support requests</li>
                    <li>Improve Auralis</li>
                    <li>Maintain platform security</li>
                    <li>Detect abuse, fraud, and unauthorized activity</li>
                    <li>Comply with legal obligations</li>
                  </ul>
                  <p className="mt-4 text-white font-medium">We do not sell your personal information.</p>

                  <h4 className="text-lg font-bold text-white mt-8 mb-4">4. AI Processing</h4>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>Auralis provides AI-powered features including transcription, caption generation, subtitle generation, translation, and related editing capabilities.</li>
                    <li>To provide these features, uploaded content may be securely processed using Google Gemini AI.</li>
                    <li>Your uploaded files are processed only for the purpose of providing the services you request.</li>
                    <li>AI-generated outputs may contain inaccuracies or errors.</li>
                    <li>Users are solely responsible for reviewing all generated captions, subtitles, translations, and other AI-generated content before publishing or relying upon them.</li>
                    <li>Users should avoid uploading highly confidential, sensitive, or legally restricted information unless they understand that such content may be processed by our trusted AI service providers solely to provide the requested features.</li>
                  </ul>

                  <h4 className="text-lg font-bold text-white mt-8 mb-4">5. Third-Party Services</h4>
                  <p>Auralis uses trusted third-party service providers to operate its services.</p>
                  
                  <div className="space-y-4 mt-4">
                    <div>
                      <p className="font-medium text-gray-300">Google Gemini</p>
                      <p className="text-sm">Used for: AI transcription, Caption generation, Subtitle generation, Translation, AI-powered editing features</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-300">Supabase</p>
                      <p className="text-sm">Used for: User authentication, Email OTP verification, Database management, Secure storage of application data</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-300">Vercel</p>
                      <p className="text-sm">Used for: Website hosting, Infrastructure, Content delivery, Performance optimization</p>
                    </div>
                  </div>
                  <p className="mt-4">These providers only process information necessary to perform their services. Their handling of information is governed by their own privacy policies and terms.</p>

                  <h4 className="text-lg font-bold text-white mt-8 mb-4">6. Sharing Your Information</h4>
                  <p>We only share information when necessary to operate Auralis. Your information may be shared with:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Google Gemini</li>
                    <li>Supabase</li>
                    <li>Vercel</li>
                    <li>Government authorities when legally required</li>
                    <li>Law enforcement agencies where required by applicable law</li>
                    <li>Professional advisers where necessary to protect our legal rights</li>
                  </ul>
                  <p className="mt-4 text-white font-medium">We never sell, rent, or trade your personal information to advertisers or data brokers.</p>

                  <h4 className="text-lg font-bold text-white mt-8 mb-4">7. User Content</h4>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>You retain ownership of all content you upload to Auralis.</li>
                    <li>We process your uploaded files only to provide the services you request, including AI caption generation, editing, rendering, exporting, and account-related functionality.</li>
                    <li>We do not claim ownership of your uploaded content.</li>
                  </ul>

                  <h4 className="text-lg font-bold text-white mt-8 mb-4">8. Data Retention</h4>
                  <p>We retain personal information only for as long as reasonably necessary to:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Operate Auralis</li>
                    <li>Maintain your account</li>
                    <li>Provide purchased services</li>
                    <li>Resolve disputes</li>
                    <li>Prevent fraud</li>
                    <li>Enforce our agreements</li>
                    <li>Comply with legal obligations</li>
                  </ul>
                  <p className="mt-4">Uploaded files may be automatically deleted after they are no longer required for providing the requested services, subject to backups, security requirements, and applicable law.</p>
                  <p>If you delete your account, we will take reasonable steps to delete or anonymize your personal information, except where retention is required by law or for legitimate business purposes.</p>

                  <h4 className="text-lg font-bold text-white mt-8 mb-4">9. Security</h4>
                  <p>We use commercially reasonable technical and organizational safeguards to protect your information. These include:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Secure HTTPS encryption</li>
                    <li>Secure authentication</li>
                    <li>Access controls</li>
                    <li>Cloud infrastructure security</li>
                    <li>Database security</li>
                    <li>Regular monitoring for unauthorized access</li>
                  </ul>
                  <p className="mt-4">While we strive to protect your information, no method of internet transmission or electronic storage is completely secure. Accordingly, we cannot guarantee absolute security.</p>

                  <h4 className="text-lg font-bold text-white mt-8 mb-4">10. Cookies and Similar Technologies</h4>
                  <p>Auralis may use cookies and similar technologies to:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Keep users signed in</li>
                    <li>Remember preferences</li>
                    <li>Maintain secure sessions</li>
                    <li>Improve performance</li>
                    <li>Analyze platform usage</li>
                    <li>Prevent fraud</li>
                  </ul>
                  <p className="mt-4">You may disable cookies through your browser settings, although certain features of Auralis may not function correctly.</p>

                  <h4 className="text-lg font-bold text-white mt-8 mb-4">11. Your Rights</h4>
                  <p>Depending on applicable law, you may have the right to:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Access your personal information</li>
                    <li>Correct inaccurate information</li>
                    <li>Request deletion of your account</li>
                    <li>Request deletion of personal information, subject to legal obligations</li>
                    <li>Withdraw consent where applicable</li>
                    <li>Contact us regarding privacy concerns</li>
                  </ul>
                  <p className="mt-4">Requests may be submitted using Auralis's in-app Feedback or Support feature.</p>

                  <h4 className="text-lg font-bold text-white mt-8 mb-4">12. Children's Privacy</h4>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>Auralis is intended for users who are 13 years of age or older.</li>
                    <li>Users under 18 years of age should use Auralis only with permission from a parent or legal guardian.</li>
                    <li>We do not knowingly collect personal information from children below the permitted minimum age.</li>
                    <li>If we become aware that such information has been collected, we will take reasonable steps to delete it.</li>
                  </ul>

                  <h4 className="text-lg font-bold text-white mt-8 mb-4">13. International Data Transfers</h4>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>Some of our service providers may process or store information on servers located outside India.</li>
                    <li>By using Auralis, you acknowledge that your information may be transferred, processed, and stored in countries where our trusted service providers operate.</li>
                    <li>Where appropriate, we take reasonable steps to ensure such transfers comply with applicable laws.</li>
                  </ul>

                  <h4 className="text-lg font-bold text-white mt-8 mb-4">14. Changes to This Privacy Policy</h4>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>We may update this Privacy Policy from time to time.</li>
                    <li>When significant changes are made, we may notify users through Auralis or by other reasonable means.</li>
                    <li>The updated version becomes effective on the Effective Date shown at the top of this document.</li>
                    <li>Your continued use of Auralis after changes become effective constitutes acceptance of the revised Privacy Policy.</li>
                  </ul>

                  <h4 className="text-lg font-bold text-white mt-8 mb-4">15. Contact Us</h4>
                  <p>If you have questions about this Privacy Policy, your personal information, or your privacy rights, you may contact us through the in-app Feedback or Support feature available within Auralis.</p>

                  <h4 className="text-lg font-bold text-white mt-8 mb-4">16. Governing Law</h4>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>This Privacy Policy is governed by the laws of India.</li>
                    <li>Any disputes relating to this Privacy Policy shall be subject to the jurisdiction of the competent courts of India, unless applicable law provides otherwise.</li>
                  </ul>

                  <h4 className="text-lg font-bold text-white mt-8 mb-4">17. Your Consent</h4>
                  <p className="pb-8 font-medium text-white">By creating an account or using Auralis, you acknowledge that you have read, understood, and agreed to this Privacy Policy.</p>
                
                </div>
              )}
              {activeTab === 'cookies' && (

                <div className="space-y-6">
                  <div>
                    <h3 className="text-2xl font-bold text-white mb-2">Cookie Policy</h3>
                    <p className="text-sm text-gray-500">Effective Date: July 19, 2026</p>
                  </div>
                  
                  <p>This Cookie Policy explains how Auralis ("Auralis", "we", "our", or "us"), operated by Decipher, uses cookies and similar technologies when you visit or use our website and services.</p>
                  <p>By continuing to use Auralis, you agree to the use of cookies as described in this Cookie Policy.</p>

                  <h4 className="text-lg font-bold text-white mt-8 mb-4">1. What Are Cookies?</h4>
                  <p>Cookies are small text files that are stored on your device when you visit a website or use an online service.</p>
                  <p>Cookies help websites remember information such as your login session, preferences, and security settings to improve your experience.</p>
                  <p>Some cookies are deleted when you close your browser (session cookies), while others remain on your device for a longer period (persistent cookies).</p>

                  <h4 className="text-lg font-bold text-white mt-8 mb-4">2. Why Auralis Uses Cookies</h4>
                  <p>Auralis uses cookies and similar technologies to:</p>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>Keep you securely signed in.</li>
                    <li>Remember your login session.</li>
                    <li>Protect your account against unauthorized access.</li>
                    <li>Remember your preferences and settings.</li>
                    <li>Improve website performance.</li>
                    <li>Detect fraud and suspicious activity.</li>
                    <li>Diagnose technical problems.</li>
                    <li>Maintain the reliability and security of our services.</li>
                  </ul>

                  <h4 className="text-lg font-bold text-white mt-8 mb-4">3. Types of Cookies We Use</h4>
                  <p className="font-medium text-white">Essential Cookies</p>
                  <p>These cookies are necessary for Auralis to function properly.</p>
                  <p>They help with:</p>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>User authentication</li>
                    <li>Session management</li>
                    <li>Security</li>
                    <li>Account access</li>
                    <li>Basic website functionality</li>
                  </ul>
                  <p>Without these cookies, Auralis may not function correctly.</p>

                  <p className="font-medium text-white mt-6">Functional Cookies</p>
                  <p>These cookies remember choices you make to improve your experience.</p>
                  <p>Examples include:</p>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>Language preferences</li>
                    <li>Interface preferences</li>
                    <li>Recently used settings</li>
                    <li>Other personalization features</li>
                  </ul>

                  <p className="font-medium text-white mt-6">Performance Cookies</p>
                  <p>These cookies help us understand how Auralis performs so we can improve reliability and user experience.</p>
                  <p>They may collect information such as:</p>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>Pages visited</li>
                    <li>Feature usage</li>
                    <li>Error reports</li>
                    <li>Loading times</li>
                    <li>General usage statistics</li>
                  </ul>
                  <p>This information is generally collected in an aggregated or anonymized form where possible.</p>

                  <h4 className="text-lg font-bold text-white mt-8 mb-4">4. Third-Party Services</h4>
                  <p>Auralis uses trusted third-party providers that may also use cookies or similar technologies as part of providing their services.</p>
                  <p>These providers currently include:</p>
                  
                  <div className="space-y-4 mt-4">
                    <div>
                      <p className="font-medium text-gray-300">Supabase</p>
                      <p className="text-sm">Used for: User authentication, Secure login sessions, Email OTP authentication, Session management</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-300">Vercel</p>
                      <p className="text-sm">Used for: Website hosting, Performance optimization, Security, Content delivery, Infrastructure</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-300">Google Gemini</p>
                      <p className="text-sm">Google Gemini is used only to provide AI-powered features such as transcription, caption generation, subtitle generation, translation, and related AI services.</p>
                      <p className="text-sm mt-1">Google Gemini itself does not place cookies on your device through Auralis for these AI features. However, if you interact directly with Google's services, Google's own policies may apply.</p>
                    </div>
                  </div>

                  <h4 className="text-lg font-bold text-white mt-8 mb-4">5. Managing Cookies</h4>
                  <p>Most web browsers allow you to:</p>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>View stored cookies.</li>
                    <li>Delete cookies.</li>
                    <li>Block cookies.</li>
                    <li>Block cookies from specific websites.</li>
                    <li>Configure browser settings to notify you before cookies are stored.</li>
                  </ul>
                  <p>Please note that disabling essential cookies may prevent parts of Auralis from functioning correctly, including account login and secure sessions.</p>

                  <h4 className="text-lg font-bold text-white mt-8 mb-4">6. Similar Technologies</h4>
                  <p>In addition to cookies, Auralis or its service providers may use similar technologies such as:</p>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>Local Storage</li>
                    <li>Session Storage</li>
                    <li>Security tokens</li>
                    <li>Device identifiers</li>
                  </ul>
                  <p>These technologies help provide secure authentication, maintain sessions, and improve service performance.</p>

                  <h4 className="text-lg font-bold text-white mt-8 mb-4">7. Updates to This Cookie Policy</h4>
                  <p>We may update this Cookie Policy from time to time to reflect changes in technology, legal requirements, or the services we provide.</p>
                  <p>When significant changes are made, we may notify users through Auralis or by other reasonable means.</p>
                  <p>The updated version becomes effective on the Effective Date shown at the top of this Policy.</p>

                  <h4 className="text-lg font-bold text-white mt-8 mb-4">8. Contact Us</h4>
                  <p>If you have any questions about this Cookie Policy or our use of cookies and similar technologies, please contact us through the in-app Feedback or Support feature available within Auralis.</p>
                  <br/>
                  <p className="font-medium text-white pb-8">By using Auralis, you acknowledge that you have read and understood this Cookie Policy and consent to the use of cookies and similar technologies as described above.</p>
                </div>

              )}
              {activeTab === 'refund' && (

                <div className="space-y-6">
                  <div>
                    <h3 className="text-2xl font-bold text-white mb-2">Refund Policy</h3>
                    <p className="text-sm text-gray-500">Effective Date: July 19, 2026</p>
                  </div>
                  
                  <p>This Refund Policy explains the conditions under which Auralis ("Auralis", "we", "our", or "us"), operated by Decipher, may provide refunds for purchases made through the Auralis platform.</p>
                  <p>By purchasing any subscription, credits, or paid services from Auralis, you agree to this Refund Policy.</p>

                  <h4 className="text-lg font-bold text-white mt-8 mb-4">1. General Policy</h4>
                  <p>We want every user to have a positive experience with Auralis. If you experience a payment issue or a genuine technical problem, we will review your refund request fairly.</p>
                  <p>Refunds are not automatically guaranteed and are reviewed on a case-by-case basis.</p>

                  <h4 className="text-lg font-bold text-white mt-8 mb-4">2. Refund Eligibility</h4>
                  <p>You may be eligible for a refund if:</p>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>Your refund request is submitted within 7 calendar days of the original purchase.</li>
                    <li>The purchased credits have not been used.</li>
                    <li>A duplicate payment was accidentally made.</li>
                    <li>A verified technical issue on Auralis's side prevented you from accessing or using the purchased service.</li>
                    <li>You were charged incorrectly due to a billing or payment error.</li>
                  </ul>
                  <p>Each request will be reviewed individually before a decision is made.</p>

                  <h4 className="text-lg font-bold text-white mt-8 mb-4">3. Non-Refundable Purchases</h4>
                  <p>Refunds will generally not be provided if:</p>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>Purchased credits have already been used, whether partially or fully.</li>
                    <li>A subscription has already been used during the billing period.</li>
                    <li>The request is made more than 7 days after the purchase date.</li>
                    <li>You simply change your mind after using the purchased features.</li>
                    <li>You are dissatisfied with AI-generated results where Auralis functioned as intended. AI outputs may vary in quality and require user review.</li>
                    <li>The issue results from your own device, internet connection, browser, software, or other factors outside Auralis's reasonable control.</li>
                    <li>We determine that the request is fraudulent, abusive, or made in bad faith.</li>
                  </ul>
                  <p>Nothing in this Policy limits any consumer rights that cannot be excluded under applicable law.</p>

                  <h4 className="text-lg font-bold text-white mt-8 mb-4">4. Duplicate Payments</h4>
                  <p>If you accidentally make the same payment more than once for the same purchase, Auralis may, after verification:</p>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>Issue a refund for the duplicate payment; or</li>
                    <li>With your agreement, convert the duplicate payment into additional credits, subscription time, or another equivalent benefit.</li>
                  </ul>
                  <p>The choice will be discussed with you before processing, where reasonably possible.</p>

                  <h4 className="text-lg font-bold text-white mt-8 mb-4">5. Technical Issues</h4>
                  <p>If a technical problem caused by Auralis prevents you from using a purchased feature, we encourage you to first contact us so we can attempt to resolve the issue.</p>
                  <p>If the issue cannot be reasonably resolved and your purchase could not be used as intended, we may approve a full or partial refund, depending on the circumstances.</p>

                  <h4 className="text-lg font-bold text-white mt-8 mb-4">6. How to Request a Refund</h4>
                  <p>To request a refund:</p>
                  <ol className="list-decimal pl-5 space-y-2">
                    <li>Open Auralis.</li>
                    <li>Navigate to the Feedback or Support section.</li>
                    <li>Submit your refund request.</li>
                    <li>Include:</li>
                    <ul className="list-disc pl-5 space-y-1 mt-2 text-sm text-gray-300">
                      <li>Your account email address.</li>
                      <li>The approximate purchase date.</li>
                      <li>The reason for your refund request.</li>
                      <li>Screenshots or additional details, if available.</li>
                    </ul>
                  </ol>
                  <p className="mt-4">Providing complete information helps us process your request more quickly.</p>

                  <h4 className="text-lg font-bold text-white mt-8 mb-4">7. Refund Review Process</h4>
                  <p>Each refund request is reviewed individually.</p>
                  <p>We may request additional information if necessary to verify your purchase or investigate the reported issue.</p>
                  <p>Submitting a refund request does not guarantee approval.</p>

                  <h4 className="text-lg font-bold text-white mt-8 mb-4">8. Refund Processing Time</h4>
                  <p>If your refund request is approved:</p>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>We will initiate the refund as soon as reasonably possible.</li>
                    <li>Depending on your payment method, bank, or payment provider, it may take 5 to 10 business days (or longer in some cases) for the refunded amount to appear in your account.</li>
                  </ul>
                  <p>Auralis is not responsible for delays caused by banks or third-party payment providers.</p>

                  <h4 className="text-lg font-bold text-white mt-8 mb-4">9. Chargebacks</h4>
                  <p>If you believe a payment was unauthorized, please contact Auralis before initiating a chargeback with your bank or payment provider.</p>
                  <p>Filing fraudulent or abusive chargebacks may result in suspension or termination of your Auralis account, where permitted by applicable law.</p>

                  <h4 className="text-lg font-bold text-white mt-8 mb-4">10. Changes to This Refund Policy</h4>
                  <p>We may update this Refund Policy from time to time.</p>
                  <p>Changes become effective on the date they are published.</p>
                  <p>Purchases made before an updated version takes effect will generally be governed by the Refund Policy that was in effect at the time of purchase, unless otherwise required by applicable law.</p>

                  <h4 className="text-lg font-bold text-white mt-8 mb-4">11. Contact Us</h4>
                  <p>For refund requests or questions regarding this Refund Policy, please use the in-app Feedback or Support feature available within Auralis.</p>
                  <br/>
                  <p className="font-medium text-white pb-8">By purchasing any paid services, subscriptions, or credits from Auralis, you acknowledge that you have read, understood, and agree to this Refund Policy.</p>
                </div>

              )}
            </div>
          </div>

          {/* Footer (only in enforce mode) */}
          {mode === 'enforce' && (
            <div className="p-6 bg-[#111] border-t border-white/10 shrink-0">
              <div className="max-w-3xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
                <p className="text-sm text-gray-400 max-w-lg text-center sm:text-left">
                  Please scroll through the policies to continue. By clicking "I Agree", you confirm that you have read and accepted our Terms and Privacy Policy.
                </p>
                <button
                  onClick={handleAccept}
                  disabled={!hasScrolledToBottom}
                  className={cn(
                    "w-full sm:w-auto px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all",
                    hasScrolledToBottom 
                      ? "bg-[#6B46C1] hover:bg-[#5536A0] text-white" 
                      : "bg-white/5 text-gray-500 cursor-not-allowed"
                  )}
                >
                  <Check size={18} />
                  I Agree
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
