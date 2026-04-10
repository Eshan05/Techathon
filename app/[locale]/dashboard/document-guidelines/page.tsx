"use client"

import * as React from "react"
import { Search, X } from "lucide-react"
import { useLocale } from "next-intl"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Link } from "@/i18n/navigation"

type DocumentGuide = {
  id: string
  title: string
  purpose: string
  whereToApply: string
  requiredDocuments: string[]
  steps: string[]
  officialOutput: string
  fee: string
  timeline: string
  caution: string
}

type BlueprintPhase = {
  title: string
  steps: string[]
}

type PageContent = {
  badgeLabel: string
  pageTitle: string
  pageSubtitle: string
  openMahabhumi: string
  openMahaOnline: string
  processSectionTitle: string
  detailedSectionTitle: string
  detailedSectionSubtitle: string
  searchPlaceholder: string
  clearSearch: string
  showingLabel: (shown: number, total: number) => string
  noResults: string
  requiredDocsLabel: string
  processStepsLabel: string
  purposeLabel: string
  whereToApplyLabel: string
  feeLabel: string
  timelineLabel: string
  officialOutputLabel: string
  cautionLabel: string
  finalChecklistTitle: string
  processBlueprint: BlueprintPhase[]
  redFlagChecklist: string[]
  documentGuides: DocumentGuide[]
}

type SupportedLocale = "en" | "hi" | "mr"

const enContent: PageContent = {
  badgeLabel: "DOCUMENT PLAYBOOK",
  pageTitle: "Land record and document application guidelines",
  pageSubtitle:
    "This page gives a practical, document-by-document guide for fetching, creating, updating, and safely using land documents. It is designed so farmers and helpers can follow each step without guesswork.",
  openMahabhumi: "Open Mahabhumi",
  openMahaOnline: "Open MahaOnline",
  processSectionTitle: "Application flow",
  detailedSectionTitle: "Detailed guide by document",
  detailedSectionSubtitle:
    "Open each document type to view purpose, required papers, exact process, expected output, and safety checks.",
  searchPlaceholder: "Search a document, process, office, or requirement",
  clearSearch: "Clear",
  showingLabel: (shown, total) => `Showing ${shown} of ${total} documents`,
  noResults:
    "No matching document found. Try a broader keyword like 7/12, mutation, sale deed, inheritance, KYC, or encumbrance.",
  requiredDocsLabel: "Required documents",
  processStepsLabel: "Process steps",
  purposeLabel: "Purpose",
  whereToApplyLabel: "Where to apply",
  feeLabel: "Fee",
  timelineLabel: "Timeline",
  officialOutputLabel: "Official output",
  cautionLabel: "Caution",
  finalChecklistTitle: "Final no-risk checklist",
  processBlueprint: [
    {
      title: "Access existing record",
      steps: [
        "Start with pincode, district, taluka, and village context",
        "Fetch informational 7/12 for quick review",
        "If legal submission is needed, fetch digitally signed copy",
      ],
    },
    {
      title: "Create or update application",
      steps: [
        "Assemble deed/inheritance + KYC + supporting proofs",
        "Submit mutation application and collect receipt",
        "Track mutation status and resolve objections quickly",
      ],
    },
    {
      title: "Store and protect documents",
      steps: [
        "Upload signed copies, receipts, and acknowledgements in vault",
        "Tag by land parcel and case type",
        "Keep both informational and legal copies clearly separated",
      ],
    },
  ],
  redFlagChecklist: [
    "Do not sign blank or partially filled forms.",
    "Do not proceed when owner name or survey number is inconsistent.",
    "Do not ignore loan/encumbrance remarks in 7/12.",
    "Do not submit originals without acknowledgement receipt.",
    "Do not rely only on agent statements without portal/office verification.",
  ],
  documentGuides: [
    {
      id: "satbara-info",
      title: "7/12 (Satbara) - informational copy",
      purpose:
        "Quickly view agricultural land details like owner name, survey/gat number, and crop information.",
      whereToApply: "Mahabhumi/Mahabhulekh portal",
      requiredDocuments: [
        "District, Taluka, Village details",
        "Survey Number / Gat Number or Owner Name",
        "Basic identity details if portal asks for confirmation",
      ],
      steps: [
        "Open Mahabhumi: https://mahabhumi.gov.in/",
        "Select district, taluka, and village",
        "Search by Survey/Gat Number or Owner Name",
        "Open record and verify owner, area, and mutation notes",
        "Download/print informational copy",
      ],
      officialOutput:
        "Informational 7/12 extract (generally not digitally signed).",
      fee: "Usually free or nominal portal fee",
      timeline: "Instant",
      caution:
        "Do not use informational copy as final legal proof where digitally signed copy is mandatory.",
    },
    {
      id: "satbara-digital",
      title: "Digitally signed 7/12 (legal copy)",
      purpose:
        "Obtain legally acceptable 7/12 for loans, court matters, and formal submissions.",
      whereToApply: "MahaOnline (Aaple Sarkar services)",
      requiredDocuments: [
        "MahaOnline account/login",
        "District, Taluka, Village",
        "Survey/Gat Number",
        "Payment method for service charge",
      ],
      steps: [
        "Open: https://cscservices.mahaonline.gov.in/Dashboard/Login.aspx",
        "Sign in and search for Digitally Signed 7/12 service",
        "Enter land location and survey/gat details",
        "Pay service fee",
        "Download digitally signed PDF and store in vault",
      ],
      officialOutput: "Digitally signed 7/12 PDF",
      fee: "Approx. Rs 15-Rs 30 per copy (can vary)",
      timeline: "Usually instant after payment",
      caution:
        "Always validate digital signature before sharing with bank/court.",
    },
    {
      id: "mutation-ferfar",
      title: "Mutation (Ferfar) application",
      purpose:
        "Update ownership/details in land records after sale, inheritance, partition, or court order.",
      whereToApply: "Talathi office (local revenue office)",
      requiredDocuments: [
        "Sale deed or inheritance/legal succession proof",
        "Applicant identity proof",
        "Signed mutation application form",
        "Supporting evidence (death certificate/court order/NOC as applicable)",
      ],
      steps: [
        "Submit mutation application with full document set at Talathi office",
        "Get mutation entry number acknowledgement",
        "Revenue verification is conducted",
        "Public notice period runs for objections",
        "Final approval updates ownership entries in records",
      ],
      officialOutput: "Mutation entry approval and updated land record",
      fee: "Varies by service and local rules",
      timeline: "Typically 15-30 days (can vary)",
      caution:
        "Track the mutation number and keep acknowledgement receipt safely.",
    },
    {
      id: "mutation-status",
      title: "Mutation status tracking",
      purpose:
        "Track whether mutation entry is pending, under objection, approved, or rejected.",
      whereToApply: "Mahabhulekh mutation status section",
      requiredDocuments: [
        "Mutation entry number",
        "District/Taluka/Village context",
      ],
      steps: [
        "Open Mahabhulekh portal",
        "Navigate to Mutation Status",
        "Enter mutation number",
        "Review current status and objection details if any",
        "If delayed, escalate with acknowledgement at Talathi office",
      ],
      officialOutput: "Current mutation processing status",
      fee: "Usually free",
      timeline: "Instant lookup",
      caution:
        "If status is unchanged for long periods, file written follow-up with receipt proof.",
    },
    {
      id: "sale-deed",
      title: "Sale deed and ownership transfer packet",
      purpose:
        "Create the core legal packet needed for ownership transfer and future mutation.",
      whereToApply: "Sub-Registrar office + Talathi office",
      requiredDocuments: [
        "Draft sale deed",
        "Seller and buyer identity/address proof",
        "Latest 7/12 and land map details",
        "Stamp duty and registration payment proof",
        "Encumbrance/loan clearance details",
      ],
      steps: [
        "Prepare deed with accurate survey, area, and boundary details",
        "Check encumbrances and pending loans",
        "Register deed at Sub-Registrar office",
        "Collect registered deed copy",
        "Use deed to start mutation process",
      ],
      officialOutput: "Registered sale deed",
      fee: "Stamp duty + registration charges as per state rules",
      timeline: "1-7 days for registration flow",
      caution:
        "Never sign if survey number, area, owner name, or consideration amount is unclear.",
    },
    {
      id: "inheritance-packet",
      title: "Inheritance transfer packet",
      purpose: "Transfer land record ownership after death of recorded owner.",
      whereToApply: "Talathi office / revenue authority",
      requiredDocuments: [
        "Death certificate",
        "Legal heir certificate or succession proof",
        "Applicant identity proofs",
        "No-objection documents from co-heirs (if applicable)",
        "Mutation application form",
      ],
      steps: [
        "Collect all heir and death records",
        "Submit inheritance mutation request",
        "Attend verification/hearing if requested",
        "Resolve objections, if any",
        "Receive updated ownership record",
      ],
      officialOutput: "Updated ownership entries for legal heirs",
      fee: "As per local office rules",
      timeline: "15-45 days depending on objection complexity",
      caution: "Missing heir declarations can delay or invalidate transfer.",
    },
    {
      id: "id-proof-pack",
      title: "Identity and address proof pack",
      purpose:
        "Standard KYC packet used across land services, loans, and government applications.",
      whereToApply: "Prepared by user; used across offices and online forms",
      requiredDocuments: [
        "Aadhaar",
        "PAN (if applicable)",
        "Voter ID or Driving License",
        "Address proof (ration card/utility bill/bank passbook)",
        "Passport-size photographs",
      ],
      steps: [
        "Scan clear color copies of all IDs",
        "Match spelling of name/date of birth across documents",
        "Store originals and scans in document vault",
        "Attach only required copies for each application",
        "Keep one signed self-attested set ready",
      ],
      officialOutput: "Reusable KYC bundle",
      fee: "No direct fee except photocopy/scanning",
      timeline: "Same day",
      caution:
        "Name mismatch across IDs is a frequent reason for application rejection.",
    },
    {
      id: "loan-check",
      title: "Loan/encumbrance verification packet",
      purpose:
        "Check whether land has active loan, charge, or legal burden before purchase or mortgage.",
      whereToApply: "Revenue records + bank/NBFC confirmations",
      requiredDocuments: [
        "Latest 7/12 extract",
        "Seller declarations",
        "Bank loan closure/no-dues proof if loan is claimed closed",
        "Related mortgage/charge release records",
      ],
      steps: [
        "Review 7/12 remarks for loan/charge entries",
        "Ask for bank no-dues/closure certificates",
        "Verify release entries are reflected in records",
        "Only proceed with transaction after clear status",
      ],
      officialOutput: "Verified encumbrance status evidence",
      fee: "Depends on copy/certificate requirements",
      timeline: "1-10 days",
      caution:
        "Do not pay full sale amount before encumbrance is clearly resolved.",
    },
  ],
}

const hiContent: PageContent = {
  badgeLabel: "दस्तावेज़ प्लेबुक",
  pageTitle: "भूमि रिकॉर्ड और दस्तावेज़ आवेदन मार्गदर्शिका",
  pageSubtitle:
    "यह पेज दस्तावेज़-दर-दस्तावेज़ व्यावहारिक गाइड देता है ताकि किसान और परिवार के सदस्य बिना भ्रम के रिकॉर्ड निकाल सकें, आवेदन कर सकें और कागज़ सुरक्षित रख सकें।",
  openMahabhumi: "महाभूमि खोलें",
  openMahaOnline: "महा ऑनलाइन खोलें",
  processSectionTitle: "आवेदन प्रक्रिया प्रवाह",
  detailedSectionTitle: "दस्तावेज़ के अनुसार विस्तृत गाइड",
  detailedSectionSubtitle:
    "हर दस्तावेज़ खोलकर उद्देश्य, आवश्यक कागज़, सटीक प्रक्रिया, आउटपुट और सावधानी देखें।",
  searchPlaceholder: "दस्तावेज़, प्रक्रिया, कार्यालय या आवश्यक कागज़ खोजें",
  clearSearch: "साफ करें",
  showingLabel: (shown, total) =>
    `${total} में से ${shown} दस्तावेज़ दिख रहे हैं`,
  noResults:
    "कोई मिलान दस्तावेज़ नहीं मिला। 7/12, म्यूटेशन, सेल डीड, इनहेरिटेंस, KYC या एनकम्ब्रेंस जैसे शब्द से खोजें।",
  requiredDocsLabel: "आवश्यक दस्तावेज़",
  processStepsLabel: "प्रक्रिया चरण",
  purposeLabel: "उद्देश्य",
  whereToApplyLabel: "कहां आवेदन करें",
  feeLabel: "शुल्क",
  timelineLabel: "समय सीमा",
  officialOutputLabel: "आधिकारिक आउटपुट",
  cautionLabel: "सावधानी",
  finalChecklistTitle: "अंतिम नो-रिस्क चेकलिस्ट",
  processBlueprint: [
    {
      title: "मौजूदा रिकॉर्ड प्राप्त करें",
      steps: [
        "पिनकोड, जिला, तालुका और गांव संदर्भ से शुरू करें",
        "जल्दी जांच के लिए 7/12 की सूचना प्रति निकालें",
        "कानूनी उपयोग हो तो डिजिटल साइन प्रति लें",
      ],
    },
    {
      title: "आवेदन बनाएं या अपडेट करें",
      steps: [
        "डीड/इनहेरिटेंस + KYC + सपोर्टिंग कागज़ तैयार करें",
        "म्यूटेशन आवेदन जमा करके रसीद लें",
        "म्यूटेशन स्टेटस ट्रैक करें और आपत्तियां जल्द सुलझाएं",
      ],
    },
    {
      title: "दस्तावेज़ सुरक्षित रखें",
      steps: [
        "साइन कॉपी, रसीद और acknowledgment वॉल्ट में अपलोड करें",
        "लैंड पार्सल और केस टाइप के हिसाब से टैग करें",
        "सूचना प्रति और कानूनी प्रति अलग-अलग रखें",
      ],
    },
  ],
  redFlagChecklist: [
    "खाली या अधूरे फॉर्म पर साइन न करें।",
    "मालिक का नाम या सर्वे नंबर न मिले तो आगे न बढ़ें।",
    "7/12 में लोन/चार्ज टिप्पणी को नजरअंदाज न करें।",
    "रसीद लिए बिना मूल दस्तावेज़ जमा न करें।",
    "केवल एजेंट की बात पर भरोसा न करें, पोर्टल/ऑफिस सत्यापन करें।",
  ],
  documentGuides: [
    {
      id: "satbara-info",
      title: "7/12 (सातबारा) - सूचना प्रति",
      purpose:
        "मालिक का नाम, सर्वे/गट नंबर, फसल जानकारी जैसी कृषि भूमि जानकारी जल्दी देखने के लिए।",
      whereToApply: "महाभूमि/महाभूलेख पोर्टल",
      requiredDocuments: [
        "जिला, तालुका, गांव विवरण",
        "सर्वे नंबर/गट नंबर या मालिक का नाम",
        "जरूरत हो तो मूल पहचान विवरण",
      ],
      steps: [
        "महाभूमि खोलें: https://mahabhumi.gov.in/",
        "जिला, तालुका, गांव चुनें",
        "सर्वे/गट नंबर या मालिक नाम से खोजें",
        "रिकॉर्ड खोलकर मालिक, क्षेत्र और म्यूटेशन नोट जांचें",
        "सूचना प्रति डाउनलोड/प्रिंट करें",
      ],
      officialOutput: "सूचनात्मक 7/12 प्रति (आमतौर पर डिजिटल साइन नहीं होती)।",
      fee: "आमतौर पर मुफ्त या बहुत मामूली शुल्क",
      timeline: "तुरंत",
      caution:
        "जहां डिजिटल साइन कॉपी जरूरी हो वहां सूचना प्रति को अंतिम कानूनी प्रमाण न मानें।",
    },
    {
      id: "satbara-digital",
      title: "डिजिटल साइन 7/12 (कानूनी प्रति)",
      purpose:
        "लोन, कोर्ट और औपचारिक जमा के लिए कानूनी रूप से मान्य 7/12 प्राप्त करना।",
      whereToApply: "महा ऑनलाइन (आपले सरकार सेवाएं)",
      requiredDocuments: [
        "महा ऑनलाइन लॉगिन",
        "जिला, तालुका, गांव",
        "सर्वे/गट नंबर",
        "शुल्क भुगतान माध्यम",
      ],
      steps: [
        "ओपन करें https://cscservices.mahaonline.gov.in/Dashboard/Login.aspx",
        "लॉगिन करके Digitally Signed 7/12 सेवा खोजें",
        "भूमि स्थान और सर्वे/गट विवरण भरें",
        "सेवा शुल्क जमा करें",
        "डिजिटल साइन PDF डाउनलोड करके वॉल्ट में रखें",
      ],
      officialOutput: "डिजिटल साइन 7/12 PDF",
      fee: "लगभग Rs 15-Rs 30 प्रति कॉपी (बदल सकता है)",
      timeline: "भुगतान के बाद आमतौर पर तुरंत",
      caution: "बैंक/कोर्ट में देने से पहले डिजिटल हस्ताक्षर सत्यापित करें।",
    },
    {
      id: "mutation-ferfar",
      title: "म्यूटेशन (फेरफार) आवेदन",
      purpose:
        "बिक्री, विरासत, विभाजन या कोर्ट आदेश के बाद भूमि रिकॉर्ड में मालिकाना बदलाव दर्ज करना।",
      whereToApply: "तलाठी कार्यालय",
      requiredDocuments: [
        "सेल डीड या विरासत/कानूनी उत्तराधिकार प्रमाण",
        "आवेदक पहचान प्रमाण",
        "साइन किया हुआ म्यूटेशन आवेदन",
        "सपोर्टिंग कागज़ (डेथ सर्टिफिकेट/कोर्ट आदेश/NOC)",
      ],
      steps: [
        "तलाठी कार्यालय में पूरा दस्तावेज़ सेट जमा करें",
        "म्यूटेशन एंट्री नंबर की रसीद लें",
        "राजस्व सत्यापन पूरा होता है",
        "आपत्ति अवधि चलती है",
        "अंतिम स्वीकृति के बाद रिकॉर्ड अपडेट होता है",
      ],
      officialOutput: "म्यूटेशन स्वीकृति और अपडेटेड रिकॉर्ड",
      fee: "सेवा और क्षेत्रीय नियमों के अनुसार",
      timeline: "आमतौर पर 15-30 दिन",
      caution: "म्यूटेशन नंबर और acknowledgment रसीद सुरक्षित रखें।",
    },
    {
      id: "mutation-status",
      title: "म्यूटेशन स्टेटस ट्रैकिंग",
      purpose:
        "म्यूटेशन प्रविष्टि पेंडिंग, आपत्ति में, मंजूर या अस्वीकृत है या नहीं यह देखने के लिए।",
      whereToApply: "महाभूलेख म्यूटेशन स्टेटस सेक्शन",
      requiredDocuments: ["म्यूटेशन एंट्री नंबर", "जिला/तालुका/गांव संदर्भ"],
      steps: [
        "महाभूलेख पोर्टल खोलें",
        "Mutation Status सेक्शन में जाएं",
        "म्यूटेशन नंबर डालें",
        "वर्तमान स्थिति और आपत्ति विवरण देखें",
        "देरी हो तो तलाठी कार्यालय में रसीद के साथ फॉलो-अप करें",
      ],
      officialOutput: "म्यूटेशन प्रक्रिया की वर्तमान स्थिति",
      fee: "आमतौर पर मुफ्त",
      timeline: "तुरंत",
      caution: "लंबे समय तक स्टेटस न बदले तो लिखित आवेदन के साथ अनुस्मारक दें।",
    },
    {
      id: "sale-deed",
      title: "सेल डीड और मालिकाना ट्रांसफर पैकेट",
      purpose:
        "मालिकाना ट्रांसफर और आगे म्यूटेशन के लिए मुख्य कानूनी दस्तावेज़ सेट तैयार करना।",
      whereToApply: "सब-रजिस्ट्रार कार्यालय + तलाठी कार्यालय",
      requiredDocuments: [
        "ड्राफ्ट सेल डीड",
        "विक्रेता/खरीदार पहचान और पता प्रमाण",
        "नवीनतम 7/12 और भूमि विवरण",
        "स्टाम्प ड्यूटी और रजिस्ट्रेशन भुगतान प्रमाण",
        "लोन/एनकम्ब्रेंस क्लियरेंस दस्तावेज़",
      ],
      steps: [
        "डीड में सर्वे नंबर, क्षेत्र और सीमाएं सही भरें",
        "एनकम्ब्रेंस और लंबित लोन जांचें",
        "सब-रजिस्ट्रार कार्यालय में रजिस्ट्रेशन करें",
        "रजिस्टर्ड डीड कॉपी लें",
        "म्यूटेशन शुरू करने के लिए डीड का उपयोग करें",
      ],
      officialOutput: "रजिस्टर्ड सेल डीड",
      fee: "स्टाम्प ड्यूटी + रजिस्ट्रेशन शुल्क",
      timeline: "रजिस्ट्रेशन प्रक्रिया 1-7 दिन",
      caution:
        "सर्वे नंबर, क्षेत्र, मालिक का नाम या राशि स्पष्ट न हो तो साइन न करें।",
    },
    {
      id: "inheritance-packet",
      title: "विरासत ट्रांसफर पैकेट",
      purpose: "रिकॉर्डेड मालिक की मृत्यु के बाद मालिकाना नामांतरण करना।",
      whereToApply: "तलाठी कार्यालय / राजस्व प्राधिकरण",
      requiredDocuments: [
        "मृत्यु प्रमाणपत्र",
        "लीगल हेयर सर्टिफिकेट या उत्तराधिकार प्रमाण",
        "आवेदक पहचान प्रमाण",
        "सह-उत्तराधिकारियों का NOC (यदि लागू)",
        "म्यूटेशन आवेदन फॉर्म",
      ],
      steps: [
        "सभी वारिस और मृत्यु दस्तावेज़ जुटाएं",
        "विरासत म्यूटेशन आवेदन जमा करें",
        "जरूरत होने पर सत्यापन/सुनवाई में उपस्थित हों",
        "आपत्तियां हों तो समाधान करें",
        "अपडेटेड मालिकाना रिकॉर्ड प्राप्त करें",
      ],
      officialOutput: "वारिसों के नाम अपडेटेड मालिकाना प्रविष्टि",
      fee: "स्थानीय नियमों के अनुसार",
      timeline: "15-45 दिन",
      caution: "वारिस घोषणा अधूरी होने से प्रक्रिया रुक सकती है।",
    },
    {
      id: "id-proof-pack",
      title: "पहचान और पता प्रमाण पैक",
      purpose:
        "भूमि सेवाओं, लोन और सरकारी आवेदनों में बार-बार उपयोग होने वाला KYC पैकेट।",
      whereToApply: "उपयोगकर्ता द्वारा तैयार, अलग-अलग कार्यालयों में उपयोग",
      requiredDocuments: [
        "आधार",
        "PAN (यदि लागू)",
        "वोटर ID या ड्राइविंग लाइसेंस",
        "पता प्रमाण (राशन कार्ड/बिजली बिल/बैंक पासबुक)",
        "पासपोर्ट साइज फोटो",
      ],
      steps: [
        "सभी ID की स्पष्ट रंगीन स्कैन कॉपी बनाएं",
        "नाम और जन्मतिथि मिलान जांचें",
        "ओरिजिनल और स्कैन वॉल्ट में सुरक्षित रखें",
        "हर आवेदन में केवल जरूरी कॉपी लगाएं",
        "एक सेल्फ-अटेस्टेड सेट तैयार रखें",
      ],
      officialOutput: "पुन: उपयोग योग्य KYC बंडल",
      fee: "सीधा शुल्क नहीं, केवल कॉपी/स्कैन खर्च",
      timeline: "उसी दिन",
      caution: "ID में नाम का अंतर आवेदन अस्वीकृति का बड़ा कारण बनता है।",
    },
    {
      id: "loan-check",
      title: "लोन/एनकम्ब्रेंस सत्यापन पैकेट",
      purpose:
        "खरीद या मॉर्गेज से पहले भूमि पर सक्रिय लोन या चार्ज की स्थिति जांचना।",
      whereToApply: "राजस्व रिकॉर्ड + बैंक/NBFC पुष्टि",
      requiredDocuments: [
        "नवीनतम 7/12",
        "विक्रेता घोषणा",
        "बैंक नो-ड्यूज/लोन क्लोजर प्रमाण",
        "मॉर्गेज/चार्ज रिलीज संबंधित रिकॉर्ड",
      ],
      steps: [
        "7/12 में लोन/चार्ज टिप्पणियां जांचें",
        "बैंक से नो-ड्यूज/क्लोजर प्रमाण लें",
        "रिलीज एंट्री रिकॉर्ड में अपडेट हुई है या नहीं जांचें",
        "स्पष्ट स्थिति के बाद ही लेनदेन करें",
      ],
      officialOutput: "एनकम्ब्रेंस स्थिति का सत्यापित प्रमाण",
      fee: "कॉपी/प्रमाण आवश्यकताओं पर निर्भर",
      timeline: "1-10 दिन",
      caution: "एनकम्ब्रेंस स्पष्ट हुए बिना पूरा भुगतान न करें।",
    },
  ],
}

const mrContent: PageContent = {
  badgeLabel: "कागदपत्र प्लेबुक",
  pageTitle: "जमीन नोंद आणि कागदपत्र अर्ज मार्गदर्शक",
  pageSubtitle:
    "हे पेज दस्तऐवज-निहाय सविस्तर मार्गदर्शन देते, ज्यामुळे शेतकरी आणि कुटुंबीय नोंदी काढणे, अर्ज करणे आणि कागदपत्रे सुरक्षित ठेवणे हे पद्धतशीर करू शकतात.",
  openMahabhumi: "महाभूमी उघडा",
  openMahaOnline: "महा ऑनलाइन उघडा",
  processSectionTitle: "अर्ज प्रक्रिया प्रवाह",
  detailedSectionTitle: "कागदपत्रानुसार सविस्तर मार्गदर्शक",
  detailedSectionSubtitle:
    "प्रत्येक कागदपत्र उघडून उद्देश, आवश्यक कागदपत्रे, अचूक प्रक्रिया, आउटपुट आणि सावधानता पहा.",
  searchPlaceholder: "कागदपत्र, प्रक्रिया, कार्यालय किंवा आवश्यक बाब शोधा",
  clearSearch: "साफ करा",
  showingLabel: (shown, total) => `${total} पैकी ${shown} कागदपत्रे दिसत आहेत`,
  noResults:
    "जुळणारे कागदपत्र सापडले नाही. 7/12, mutation, sale deed, inheritance, KYC किंवा encumbrance असे शब्द वापरून शोधा.",
  requiredDocsLabel: "आवश्यक कागदपत्रे",
  processStepsLabel: "प्रक्रिया टप्पे",
  purposeLabel: "उद्देश",
  whereToApplyLabel: "कोठे अर्ज करायचा",
  feeLabel: "शुल्क",
  timelineLabel: "कालावधी",
  officialOutputLabel: "अधिकृत आउटपुट",
  cautionLabel: "सावधानता",
  finalChecklistTitle: "अंतिम नो-रिस्क तपासणी",
  processBlueprint: [
    {
      title: "विद्यमान नोंद मिळवा",
      steps: [
        "पिनकोड, जिल्हा, तालुका, गाव संदर्भाने सुरुवात करा",
        "जलद पडताळणीसाठी माहितीपर 7/12 घ्या",
        "कायदेशीर वापरासाठी डिजिटल साइन प्रति घ्या",
      ],
    },
    {
      title: "अर्ज तयार करा किंवा अपडेट करा",
      steps: [
        "डीड/वारसा + KYC + पूरक पुरावे तयार ठेवा",
        "म्यूटेशन अर्ज भरून रसीद घ्या",
        "म्यूटेशन स्थिती तपासत रहा आणि हरकती सोडवा",
      ],
    },
    {
      title: "कागदपत्रे सुरक्षित ठेवा",
      steps: [
        "साइन कॉपी, पावत्या, acknowledgment वॉल्टमध्ये अपलोड करा",
        "लँड पार्सल आणि केस प्रकारानुसार टॅग करा",
        "माहितीपर आणि कायदेशीर प्रती वेगळ्या ठेवा",
      ],
    },
  ],
  redFlagChecklist: [
    "रिकाम्या किंवा अपूर्ण फॉर्मवर सही करू नका.",
    "मालकाचे नाव किंवा सर्वे नंबर न जुळल्यास पुढे जाऊ नका.",
    "7/12 मधील कर्ज/चार्ज नोंदी दुर्लक्ष करू नका.",
    "पावतीशिवाय मूळ कागदपत्रे जमा करू नका.",
    "फक्त एजंटच्या शब्दावर अवलंबून राहू नका; पोर्टल/कार्यालय पडताळणी करा.",
  ],
  documentGuides: [
    {
      id: "satbara-info",
      title: "7/12 (सातबारा) - माहितीपर प्रति",
      purpose:
        "मालकाचे नाव, सर्वे/गट नंबर, पिकांची माहिती अशा कृषि जमिनीच्या तपशीलांची जलद पाहणी करण्यासाठी.",
      whereToApply: "महाभूमी/महाभूलेख पोर्टल",
      requiredDocuments: [
        "जिल्हा, तालुका, गाव माहिती",
        "सर्वे नंबर/गट नंबर किंवा मालकाचे नाव",
        "गरज असल्यास मूलभूत ओळख तपशील",
      ],
      steps: [
        "महाभूमी उघडा: https://mahabhumi.gov.in/",
        "जिल्हा, तालुका, गाव निवडा",
        "सर्वे/गट नंबर किंवा मालक नावाने शोधा",
        "नोंद उघडून मालक, क्षेत्र आणि म्यूटेशन टिपा तपासा",
        "माहितीपर प्रति डाउनलोड/प्रिंट करा",
      ],
      officialOutput: "माहितीपर 7/12 प्रति (साधारणपणे डिजिटल साइन नसते).",
      fee: "साधारणतः मोफत किंवा अत्यल्प शुल्क",
      timeline: "ताबडतोब",
      caution:
        "जिथे डिजिटल साइन प्रति आवश्यक आहे तिथे माहितीपर प्रति अंतिम पुरावा म्हणून वापरू नका.",
    },
    {
      id: "satbara-digital",
      title: "डिजिटल साइन 7/12 (कायदेशीर प्रति)",
      purpose:
        "कर्ज, कोर्ट आणि अधिकृत सादरीकरणासाठी कायदेशीररीत्या मान्य 7/12 मिळवण्यासाठी.",
      whereToApply: "महा ऑनलाइन (आपले सरकार सेवा)",
      requiredDocuments: [
        "महा ऑनलाइन लॉगिन",
        "जिल्हा, तालुका, गाव",
        "सर्वे/गट नंबर",
        "शुल्क भरण्याची सुविधा",
      ],
      steps: [
        "उघडा: https://cscservices.mahaonline.gov.in/Dashboard/Login.aspx",
        "लॉगिन करून Digitally Signed 7/12 सेवा शोधा",
        "जमीन स्थान आणि सर्वे/गट तपशील भरा",
        "सेवा शुल्क भरा",
        "डिजिटल साइन PDF डाउनलोड करून वॉल्टमध्ये ठेवा",
      ],
      officialOutput: "डिजिटल साइन 7/12 PDF",
      fee: "साधारण Rs 15-Rs 30 प्रति प्रति (बदलू शकतो)",
      timeline: "पेमेंटनंतर बहुतेक वेळा ताबडतोब",
      caution: "बँक/कोर्टला देण्यापूर्वी डिजिटल स्वाक्षरी पडताळा.",
    },
    {
      id: "mutation-ferfar",
      title: "म्यूटेशन (फेरफार) अर्ज",
      purpose:
        "विक्री, वारसा, विभागणी किंवा कोर्ट आदेशानंतर जमीन नोंदीत मालकी बदल नोंदवण्यासाठी.",
      whereToApply: "तलाठी कार्यालय",
      requiredDocuments: [
        "सेल डीड किंवा वारसा/कायदेशीर उत्तराधिकार पुरावा",
        "अर्जदार ओळख पुरावा",
        "सही केलेला म्यूटेशन अर्ज",
        "पूरक कागदपत्रे (मृत्यू प्रमाणपत्र/कोर्ट आदेश/NOC)",
      ],
      steps: [
        "तलाठी कार्यालयात पूर्ण कागदपत्र संच जमा करा",
        "म्यूटेशन एंट्री क्रमांकाची पावती घ्या",
        "महसूल पडताळणी होते",
        "हरकत कालावधी चालतो",
        "अंतिम मंजुरीनंतर नोंद अपडेट होते",
      ],
      officialOutput: "म्यूटेशन मंजुरी आणि अपडेटेड नोंद",
      fee: "सेवा आणि स्थानिक नियमांनुसार",
      timeline: "साधारण 15-30 दिवस",
      caution: "म्यूटेशन क्रमांक आणि acknowledgment पावती सुरक्षित ठेवा.",
    },
    {
      id: "mutation-status",
      title: "म्यूटेशन स्थिती ट्रॅकिंग",
      purpose:
        "म्यूटेशन नोंद प्रलंबित, हरकतीत, मंजूर किंवा नाकारली आहे का हे पाहण्यासाठी.",
      whereToApply: "महाभूलेख म्यूटेशन स्टेटस विभाग",
      requiredDocuments: [
        "म्यूटेशन एंट्री क्रमांक",
        "जिल्हा/तालुका/गाव संदर्भ",
      ],
      steps: [
        "महाभूलेख पोर्टल उघडा",
        "Mutation Status विभागात जा",
        "म्यूटेशन क्रमांक टाका",
        "सध्याची स्थिती आणि हरकत तपशील पहा",
        "उशीर झाल्यास पावतीसह तलाठी कार्यालयात पाठपुरावा करा",
      ],
      officialOutput: "म्यूटेशन प्रक्रियेची सद्यस्थिती",
      fee: "साधारण मोफत",
      timeline: "ताबडतोब",
      caution: "स्थितीत बदल न झाल्यास लिखित पाठपुरावा करा.",
    },
    {
      id: "sale-deed",
      title: "सेल डीड आणि मालकी हस्तांतरण पॅकेट",
      purpose:
        "मालकी हस्तांतरण आणि पुढील म्यूटेशनसाठी मुख्य कायदेशीर संच तयार करणे.",
      whereToApply: "सब-रजिस्ट्रार कार्यालय + तलाठी कार्यालय",
      requiredDocuments: [
        "ड्राफ्ट सेल डीड",
        "विक्रेता/खरेदीदार ओळख व पत्ता पुरावा",
        "नवीनतम 7/12 आणि जमीन तपशील",
        "स्टॅम्प ड्यूटी आणि नोंदणी पेमेंट पुरावा",
        "कर्ज/एन्कम्ब्रन्स क्लिअरन्स कागदपत्रे",
      ],
      steps: [
        "डीडमध्ये सर्वे नंबर, क्षेत्र आणि सीमा अचूक भरा",
        "एन्कम्ब्रन्स आणि प्रलंबित कर्ज तपासा",
        "सब-रजिस्ट्रार कार्यालयात नोंदणी करा",
        "नोंदणीकृत डीडची प्रति घ्या",
        "म्यूटेशन सुरू करण्यासाठी त्याचा वापर करा",
      ],
      officialOutput: "नोंदणीकृत सेल डीड",
      fee: "स्टॅम्प ड्यूटी + नोंदणी शुल्क",
      timeline: "नोंदणी प्रक्रिया 1-7 दिवस",
      caution:
        "सर्वे नंबर, क्षेत्र, मालकाचे नाव किंवा रक्कम अस्पष्ट असल्यास सही करू नका.",
    },
    {
      id: "inheritance-packet",
      title: "वारसा हस्तांतरण पॅकेट",
      purpose: "नोंद असलेल्या मालकाच्या मृत्यूनंतर मालकी नावांतरणासाठी.",
      whereToApply: "तलाठी कार्यालय / महसूल प्राधिकरण",
      requiredDocuments: [
        "मृत्यू प्रमाणपत्र",
        "कायदेशीर वारस प्रमाणपत्र/उत्तराधिकार पुरावा",
        "अर्जदार ओळख पुरावे",
        "सह-वारसांचे NOC (लागू असल्यास)",
        "म्यूटेशन अर्ज फॉर्म",
      ],
      steps: [
        "सर्व वारस आणि मृत्यू कागदपत्रे गोळा करा",
        "वारसा म्यूटेशन अर्ज जमा करा",
        "गरज असल्यास पडताळणी/सुनावणीत हजर राहा",
        "हरकती असल्यास निकाली काढा",
        "अपडेटेड मालकी नोंद मिळवा",
      ],
      officialOutput: "वारसांच्या नावाने अपडेटेड मालकी नोंद",
      fee: "स्थानिक नियमांनुसार",
      timeline: "15-45 दिवस",
      caution: "वारस घोषणा अपूर्ण असल्यास प्रक्रिया अडकू शकते.",
    },
    {
      id: "id-proof-pack",
      title: "ओळख व पत्ता पुरावा संच",
      purpose: "जमीन सेवा, कर्ज आणि सरकारी अर्जात वारंवार लागणारा KYC संच.",
      whereToApply: "वापरकर्त्याने तयार करायचा, विविध कार्यालयात वापरायचा",
      requiredDocuments: [
        "आधार",
        "PAN (लागू असल्यास)",
        "मतदार ओळखपत्र किंवा ड्रायव्हिंग लायसन्स",
        "पत्ता पुरावा (रेशन कार्ड/वीज बिल/बँक पासबुक)",
        "पासपोर्ट आकार फोटो",
      ],
      steps: [
        "सर्व ID चे स्पष्ट रंगीत स्कॅन करा",
        "नाव आणि जन्मतारीख जुळते का तपासा",
        "मूळ आणि स्कॅन वॉल्टमध्ये सुरक्षित ठेवा",
        "प्रत्येक अर्जात फक्त आवश्यक प्रती जोडा",
        "एक self-attested संच तयार ठेवा",
      ],
      officialOutput: "पुन्हा वापरता येणारा KYC संच",
      fee: "थेट शुल्क नाही, फक्त कॉपी/स्कॅन खर्च",
      timeline: "त्याच दिवशी",
      caution: "ID मधील नावातील तफावत अर्ज नाकारला जाण्याचे प्रमुख कारण असते.",
    },
    {
      id: "loan-check",
      title: "कर्ज/एन्कम्ब्रन्स पडताळणी संच",
      purpose:
        "खरेदी किंवा गहाणपूर्वी जमिनीवर सक्रिय कर्ज/चार्ज आहे का ते तपासण्यासाठी.",
      whereToApply: "महसूल नोंदी + बँक/NBFC पडताळणी",
      requiredDocuments: [
        "नवीनतम 7/12",
        "विक्रेत्याचे घोषणापत्र",
        "बँक no-dues/loan closure पुरावा",
        "मॉर्गेज/चार्ज रिलीज संबंधित नोंदी",
      ],
      steps: [
        "7/12 मधील कर्ज/चार्ज निरीक्षण तपासा",
        "बँकेकडून no-dues/closure प्रमाणपत्र घ्या",
        "रिलीज नोंदी अपडेट झाल्या का ते तपासा",
        "स्पष्ट स्थितीनंतरच व्यवहार पूर्ण करा",
      ],
      officialOutput: "एन्कम्ब्रन्स स्थितीचा पडताळलेला पुरावा",
      fee: "प्रमाणपत्र/कॉपीनुसार बदलतो",
      timeline: "1-10 दिवस",
      caution: "एन्कम्ब्रन्स स्पष्ट न झाल्यास पूर्ण रक्कम देऊ नका.",
    },
  ],
}

const localizedContent: Record<SupportedLocale, PageContent> = {
  en: enContent,
  hi: hiContent,
  mr: mrContent,
}

function resolveContent(locale: string): PageContent {
  if (locale === "hi" || locale === "mr" || locale === "en") {
    return localizedContent[locale]
  }
  return enContent
}

export default function DocumentGuidelinesPage() {
  const locale = useLocale()
  const content = React.useMemo(() => resolveContent(locale), [locale])
  const [searchQuery, setSearchQuery] = React.useState("")

  const filteredGuides = React.useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) {
      return content.documentGuides
    }

    return content.documentGuides.filter((guide) => {
      const haystack = [
        guide.title,
        guide.purpose,
        guide.whereToApply,
        guide.officialOutput,
        guide.caution,
        guide.fee,
        guide.timeline,
        ...guide.requiredDocuments,
        ...guide.steps,
      ]
        .join(" ")
        .toLowerCase()

      return haystack.includes(query)
    })
  }, [content.documentGuides, searchQuery])

  return (
    <div className="grid gap-6 pb-4">
      <section className="grid gap-3">
        <Badge variant="outline" className="w-fit">
          {content.badgeLabel}
        </Badge>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {content.pageTitle}
        </h1>
        <p className="max-w-4xl text-sm text-muted-foreground sm:text-base">
          {content.pageSubtitle}
        </p>
        <div className="flex flex-wrap gap-2 text-sm">
          <Link
            href="https://mahabhumi.gov.in/"
            className="rounded-md border px-3 py-1.5 hover:bg-muted"
          >
            {content.openMahabhumi}
          </Link>
          <Link
            href="https://cscservices.mahaonline.gov.in/Dashboard/Login.aspx"
            className="rounded-md border px-3 py-1.5 hover:bg-muted"
          >
            {content.openMahaOnline}
          </Link>
        </div>
      </section>

      <section className="grid gap-2">
        <h2 className="text-xl font-semibold">{content.processSectionTitle}</h2>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {content.processBlueprint.map((phase) => (
          <Card key={phase.title}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{phase.title}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm text-muted-foreground">
              {phase.steps.map((step) => (
                <div key={step} className="rounded-md bg-muted/40 px-2.5 py-2">
                  {step}
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-3">
        <div>
          <h2 className="text-xl font-semibold">
            {content.detailedSectionTitle}
          </h2>
          <p className="text-sm text-muted-foreground">
            {content.detailedSectionSubtitle}
          </p>
        </div>

        <div className="rounded-xl border bg-background p-3">
          <div className="relative">
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={content.searchPlaceholder}
              className="peer ps-9 pe-18"
            />
            <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3 text-muted-foreground">
              <Search className="size-4" />
            </div>
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute inset-y-0 end-2 my-auto inline-flex h-7 items-center justify-center rounded-md px-2 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="me-1 size-3.5" />
                {content.clearSearch}
              </button>
            ) : null}
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            {content.showingLabel(
              filteredGuides.length,
              content.documentGuides.length
            )}
          </div>
        </div>

        {filteredGuides.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-sm text-muted-foreground">
              {content.noResults}
            </CardContent>
          </Card>
        ) : null}

        <Accordion type="single" collapsible className="w-full space-y-2">
          {filteredGuides.map((guide) => (
            <AccordionItem
              key={guide.id}
              value={guide.id}
              className="rounded-xl border px-4"
            >
              <AccordionTrigger className="text-left text-base">
                {guide.title}
              </AccordionTrigger>
              <AccordionContent className="grid gap-4 pb-4 text-sm">
                <div className="rounded-lg border bg-muted/20 p-3">
                  <div className="text-xs text-muted-foreground">
                    {content.purposeLabel}
                  </div>
                  <div className="mt-1">{guide.purpose}</div>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-lg border p-3">
                    <div className="text-xs text-muted-foreground">
                      {content.whereToApplyLabel}
                    </div>
                    <div className="mt-1 font-medium">{guide.whereToApply}</div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="text-xs text-muted-foreground">
                      {content.feeLabel}
                    </div>
                    <div className="mt-1 font-medium">{guide.fee}</div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="text-xs text-muted-foreground">
                      {content.timelineLabel}
                    </div>
                    <div className="mt-1 font-medium">{guide.timeline}</div>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-lg border p-3">
                    <div className="mb-2 text-xs text-muted-foreground uppercase">
                      {content.requiredDocsLabel}
                    </div>
                    <div className="grid gap-2">
                      {guide.requiredDocuments.map((item) => (
                        <div
                          key={item}
                          className="rounded-md bg-muted/40 px-2.5 py-2"
                        >
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-lg border p-3">
                    <div className="mb-2 text-xs text-muted-foreground uppercase">
                      {content.processStepsLabel}
                    </div>
                    <div className="grid gap-2">
                      {guide.steps.map((step, index) => (
                        <div
                          key={`${guide.id}-${index}`}
                          className="rounded-md bg-muted/40 px-2.5 py-2"
                        >
                          {index + 1}. {step}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-lg border border-emerald-500/30 bg-emerald-50/40 p-3 dark:bg-emerald-950/20">
                    <div className="text-xs text-emerald-700 dark:text-emerald-400">
                      {content.officialOutputLabel}
                    </div>
                    <div className="mt-1 font-medium">
                      {guide.officialOutput}
                    </div>
                  </div>
                  <div className="rounded-lg border border-amber-500/30 bg-amber-50/40 p-3 dark:bg-amber-950/20">
                    <div className="text-xs text-amber-700 dark:text-amber-400">
                      {content.cautionLabel}
                    </div>
                    <div className="mt-1 font-medium">{guide.caution}</div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      <section className="grid gap-3">
        <h2 className="text-xl font-semibold">{content.finalChecklistTitle}</h2>
        <Card>
          <CardContent className="grid gap-2 pt-6 text-sm">
            {content.redFlagChecklist.map((item) => (
              <div
                key={item}
                className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2"
              >
                {item}
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
