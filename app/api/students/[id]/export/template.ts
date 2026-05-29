export function generateDiaryHTML(data: any): string {
  const {
    profile,
    preAdmissionRecords,
    preCollegeActivities,
    semesterResults,
    aptitudeScores,
    initialQuestionnaire,
    goalsDeclaration,
    mentorAssignments,
    sessions,
    portfolioRatings,
    backlogRecords,
    extracurricularLog,
    booksReadLog,
    socialWorkLog,
    tasks,
  } = data

  const formatDate = (date: string) => {
    if (!date) return ''
    const d = new Date(date)
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  const renderCheckbox = (checked: boolean) => {
    return checked ? '☑' : '☐'
  }

  const renderRadio = (selected: string, value: string) => {
    return selected === value ? '●' : '○'
  }

  let html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @page {
      size: A4;
      margin: 0;
    }
    * {
      box-sizing: border-box;
    }
    body {
      margin: 0;
      padding: 0;
      font-family: Georgia, serif;
      font-size: 11pt;
      line-height: 1.4;
      color: #000;
      background: #fff;
    }
    .page {
      width: 210mm;
      height: 297mm;
      padding: 15mm 15mm 20mm 15mm;
      position: relative;
      page-break-after: always;
      background: #fff;
    }
    .page::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 8px;
      background: #1a3a6b;
    }
    .page-number {
      position: absolute;
      bottom: 8mm;
      right: 15mm;
      font-family: Arial, sans-serif;
      font-size: 9pt;
      color: #1a3a6b;
    }
    .section-header {
      font-family: Arial, sans-serif;
      font-size: 12pt;
      font-weight: bold;
      background: #1a3a6b;
      color: #fff;
      padding: 6px 12px;
      margin: 12px 0 8px 0;
      text-transform: uppercase;
    }
    .section-number {
      display: inline-block;
      width: 24px;
      height: 24px;
      background: #1a3a6b;
      color: #fff;
      border-radius: 50%;
      text-align: center;
      line-height: 24px;
      font-family: Arial, sans-serif;
      font-size: 11pt;
      font-weight: bold;
      margin-right: 8px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 8px 0;
      font-size: 10pt;
    }
    th {
      background: #1a3a6b;
      color: #fff;
      font-family: Arial, sans-serif;
      font-weight: bold;
      padding: 6px 8px;
      text-align: left;
      border: 1px solid #1a3a6b;
    }
    td {
      padding: 5px 8px;
      border: 1px solid #ccc;
      vertical-align: top;
    }
    .two-col {
      display: flex;
      gap: 12px;
    }
    .two-col > div {
      flex: 1;
    }
    .field-row {
      display: flex;
      margin: 4px 0;
    }
    .field-label {
      font-family: Arial, sans-serif;
      font-weight: bold;
      min-width: 140px;
      color: #1a3a6b;
    }
    .field-value {
      flex: 1;
      border-bottom: 1px dotted #333;
      padding-left: 8px;
    }
    .signature-block {
      display: flex;
      gap: 20px;
      margin-top: 20px;
    }
    .signature-block > div {
      flex: 1;
      text-align: center;
    }
    .signature-line {
      border-bottom: 1px dotted #333;
      margin-top: 30px;
      padding-bottom: 4px;
    }
    .checkbox-item {
      margin: 3px 0;
    }
    .radio-table td {
      text-align: center;
      padding: 4px;
    }
    .highlight-red {
      background-color: #ffe6e6 !important;
    }
    .highlight-green {
      background-color: #e6ffe6 !important;
    }
    .ai-insights {
      background-color: #e8f4f8;
      border: 1px solid #1a3a6b;
      padding: 12px;
      margin: 12px 0;
      border-radius: 4px;
    }
    .ai-insights-header {
      font-family: Arial, sans-serif;
      font-size: 9pt;
      font-weight: bold;
      color: #1a3a6b;
      margin-bottom: 8px;
      text-transform: uppercase;
    }
    .indisciplinary-flag {
      border: 2px solid #d32f2f;
      background-color: #ffebee;
      padding: 12px;
      margin: 12px 0;
      border-radius: 4px;
    }
    .indisciplinary-flag-header {
      font-family: Arial, sans-serif;
      font-size: 11pt;
      font-weight: bold;
      color: #d32f2f;
      margin-bottom: 8px;
    }
    .lined-textarea {
      border: 1px solid #ccc;
      min-height: 60px;
      padding: 8px;
      background-image: repeating-linear-gradient(transparent, transparent 23px, #ccc 23px, #ccc 24px);
      line-height: 24px;
      margin: 8px 0;
    }
    .accordion-box {
      border: 1px solid #1a3a6b;
      margin: 8px 0;
      border-radius: 4px;
    }
    .accordion-header {
      background: #1a3a6b;
      color: #fff;
      padding: 6px 12px;
      font-family: Arial, sans-serif;
      font-weight: bold;
      font-size: 10pt;
    }
    .accordion-content {
      padding: 10px 12px;
    }
    .gold-divider {
      height: 3px;
      background: #c8a84b;
      margin: 12px 0;
    }
    .navy-divider {
      height: 2px;
      background: #1a3a6b;
      margin: 8px 0;
    }
    .center-text {
      text-align: center;
    }
    .bold {
      font-weight: bold;
    }
    .small-text {
      font-size: 9pt;
    }
  </style>
</head>
<body>`

  // PAGE 1 - COVER PAGE
  html += `
<div class="page">
  <div class="page-number">1</div>
  <div style="text-align: center; margin-top: 20px;">
    <div style="font-family: Arial, sans-serif; font-size: 10pt; color: #1a3a6b; font-weight: bold; margin-bottom: 8px;">AUTONOMOUS INSTITUTION</div>
    <div style="font-size: 8pt; margin-bottom: 20px;">Approved by AICTE | Affiliated to JNTUH | Accredited by NAAC</div>
    
    <div style="border: 4px solid #1a3a6b; padding: 30px 40px; display: inline-block; margin: 20px 0;">
      <div style="font-family: Arial, sans-serif; font-size: 32pt; font-weight: bold; color: #1a3a6b;">MENTORING DIARY</div>
    </div>
    
    <div style="margin-top: 30px; font-size: 13pt;">
      <div style="margin: 8px 0;"><strong>Name:</strong> ${profile?.name || ''}</div>
      <div style="margin: 8px 0;"><strong>Roll Number:</strong> ${profile?.roll_number || ''}</div>
      <div style="margin: 8px 0;"><strong>Branch & Section:</strong> ${profile?.branch || ''} ${profile?.section || ''}</div>
      <div style="margin: 8px 0;"><strong>Academic Year:</strong> ${profile?.academic_year || ''}</div>
    </div>
    
    <div style="margin-top: 40px; font-size: 11pt;">
      <div style="margin: 6px 0;"><strong>Mentor:</strong> ${mentorAssignments[0]?.mentor_name || ''}</div>
      <div style="margin: 6px 0;"><strong>Designation:</strong> ${mentorAssignments[0]?.mentor_designation || ''}</div>
      <div style="margin: 6px 0;"><strong>Department:</strong> ${mentorAssignments[0]?.mentor_department || ''}</div>
    </div>
    
    <div style="position: absolute; bottom: 15mm; left: 15mm; right: 15mm; text-align: center; font-size: 9pt; color: #1a3a6b;">
      B.Tech (4-Year Programme) | Department of ${profile?.branch || ''}
    </div>
  </div>
</div>`

  // PAGE 2 - MENTEE PROFILE
  html += `
<div class="page">
  <div class="page-number">2</div>
  <div class="section-header">MENTEE DETAILS</div>
  
  <div class="two-col">
    <div>
      <div class="field-row">
        <div class="field-label">Name:</div>
        <div class="field-value">${profile?.name || ''}</div>
      </div>
      <div class="field-row">
        <div class="field-label">Roll Number:</div>
        <div class="field-value">${profile?.roll_number || ''}</div>
      </div>
      <div class="field-row">
        <div class="field-label">Branch & Section:</div>
        <div class="field-value">${profile?.branch || ''} ${profile?.section || ''}</div>
      </div>
      <div class="field-row">
        <div class="field-label">Blood Group:</div>
        <div class="field-value">${profile?.blood_group || ''}</div>
      </div>
      <div class="field-row">
        <div class="field-label">Mobile:</div>
        <div class="field-value">${profile?.mobile || ''}</div>
      </div>
      <div class="field-row">
        <div class="field-label">Personal Email:</div>
        <div class="field-value">${profile?.email || ''}</div>
      </div>
      <div class="field-row">
        <div class="field-label">Parent Email:</div>
        <div class="field-value">${profile?.parent_email || ''}</div>
      </div>
    </div>
    <div>
      <div class="field-row">
        <div class="field-label">EAMCET/ECET Rank:</div>
        <div class="field-value">${profile?.entrance_rank || ''}</div>
      </div>
      <div class="field-row">
        <div class="field-label">Quota:</div>
        <div class="field-value">${profile?.quota || ''}</div>
      </div>
      <div class="field-row">
        <div class="field-label">Category:</div>
        <div class="field-value">${profile?.category || ''}</div>
      </div>
      <div class="field-row">
        <div class="field-label">Father Name:</div>
        <div class="field-value">${profile?.father_name || ''}</div>
      </div>
      <div class="field-row">
        <div class="field-label">Father Occupation:</div>
        <div class="field-value">${profile?.father_occupation || ''}</div>
      </div>
      <div class="field-row">
        <div class="field-label">Father Education:</div>
        <div class="field-value">${profile?.father_education || ''}</div>
      </div>
      <div class="field-row">
        <div class="field-label">Father Mobile:</div>
        <div class="field-value">${profile?.father_mobile || ''}</div>
      </div>
    </div>
  </div>
  
  <div class="field-row">
    <div class="field-label">Residential Address:</div>
    <div class="field-value">${profile?.address || ''}</div>
  </div>
  
  <div class="field-row">
    <div class="field-label">Identification Marks:</div>
    <div class="field-value">${profile?.identification_marks || ''}</div>
  </div>
  
  <div class="two-col">
    <div>
      <div class="field-row">
        <div class="field-label">Mother Name:</div>
        <div class="field-value">${profile?.mother_name || ''}</div>
      </div>
      <div class="field-row">
        <div class="field-label">Mother Occupation:</div>
        <div class="field-value">${profile?.mother_occupation || ''}</div>
      </div>
      <div class="field-row">
        <div class="field-label">Mother Education:</div>
        <div class="field-value">${profile?.mother_education || ''}</div>
      </div>
      <div class="field-row">
        <div class="field-label">Mother Mobile:</div>
        <div class="field-value">${profile?.mother_mobile || ''}</div>
      </div>
    </div>
    <div>
      <div class="field-row">
        <div class="field-label">Guardian Name:</div>
        <div class="field-value">${profile?.guardian_name || ''}</div>
      </div>
      <div class="field-row">
        <div class="field-label">Guardian Occupation:</div>
        <div class="field-value">${profile?.guardian_occupation || ''}</div>
      </div>
      <div class="field-row">
        <div class="field-label">Guardian Address:</div>
        <div class="field-value">${profile?.guardian_address || ''}</div>
      </div>
      <div class="field-row">
        <div class="field-label">Guardian Phone:</div>
        <div class="field-value">${profile?.guardian_phone || ''}</div>
      </div>
    </div>
  </div>
</div>`

  // PAGE 3 - PRE-B.TECH ACADEMIC HISTORY + B.TECH SEMESTER GRID
  html += `
<div class="page">
  <div class="page-number">3</div>
  <div class="section-header">PRE-B.TECH ACADEMIC RECORD</div>
  
  <table>
    <thead>
      <tr>
        <th>Level</th>
        <th>Board</th>
        <th>Subjects</th>
        <th>Year of Passing</th>
        <th>% of Marks</th>
        <th>Class/Grade</th>
        <th>Medium</th>
      </tr>
    </thead>
    <tbody>
      ${preAdmissionRecords.map((record: any) => `
        <tr>
          <td>${record.level || ''}</td>
          <td>${record.board || ''}</td>
          <td>${record.subjects || ''}</td>
          <td>${record.year_of_passing || ''}</td>
          <td>${record.percentage || ''}</td>
          <td>${record.class_grade || ''}</td>
          <td>${record.medium || ''}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  
  <div class="navy-divider"></div>
  
  <div class="section-header">B.TECH SEMESTER-WISE ACADEMIC PROGRESS</div>
  
  <table>
    <thead>
      <tr>
        <th>Metric</th>
        <th>Yr1S1</th>
        <th>Yr1S2</th>
        <th>Yr2S1</th>
        <th>Yr2S2</th>
        <th>Yr3S1</th>
        <th>Yr3S2</th>
        <th>Yr4S1</th>
        <th>Yr4S2</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>SGPA</strong></td>
        ${[1,2,3,4,5,6,7,8].map(i => {
          const sem = semesterResults.find((s: any) => s.year === Math.ceil(i/2) && s.semester === (i%2===0?2:1))
          return `<td>${sem?.sgpa || ''}</td>`
        }).join('')}
      </tr>
      <tr>
        <td><strong>CGPA</strong></td>
        ${[1,2,3,4,5,6,7,8].map(i => {
          const sem = semesterResults.find((s: any) => s.year === Math.ceil(i/2) && s.semester === (i%2===0?2:1))
          return `<td>${sem?.cgpa || ''}</td>`
        }).join('')}
      </tr>
      <tr>
        <td><strong>Credits Earned</strong></td>
        ${[1,2,3,4,5,6,7,8].map(i => {
          const sem = semesterResults.find((s: any) => s.year === Math.ceil(i/2) && s.semester === (i%2===0?2:1))
          return `<td>${sem?.credits_earned || ''}</td>`
        }).join('')}
      </tr>
      <tr>
        <td><strong>Year of Passing</strong></td>
        ${[1,2,3,4,5,6,7,8].map(i => {
          const sem = semesterResults.find((s: any) => s.year === Math.ceil(i/2) && s.semester === (i%2===0?2:1))
          return `<td>${sem?.year_of_passing || ''}</td>`
        }).join('')}
      </tr>
      <tr>
        <td><strong>Backlogs</strong></td>
        ${[1,2,3,4,5,6,7,8].map(i => {
          const sem = semesterResults.find((s: any) => s.year === Math.ceil(i/2) && s.semester === (i%2===0?2:1))
          return `<td>${sem?.backlogs || ''}</td>`
        }).join('')}
      </tr>
    </tbody>
  </table>
  
  <div style="margin-top: 12px; font-weight: bold; font-family: Arial, sans-serif; color: #1a3a6b;">
    Final CGPA: ${semesterResults[semesterResults.length-1]?.cgpa || '___'}
  </div>
</div>`

  // PAGE 4 - CO/EXTRA-CURRICULAR + APTITUDE TEST SCORES
  html += `
<div class="page">
  <div class="page-number">4</div>
  <div class="section-header">CO/EXTRA-CURRICULAR ACTIVITIES PRIOR TO B.TECH</div>
  
  <table>
    <thead>
      <tr>
        <th>Activity Type</th>
        <th>Activity Name</th>
        <th>Level</th>
        <th>Achievement</th>
        <th>Year</th>
      </tr>
    </thead>
    <tbody>
      ${preCollegeActivities.map((activity: any) => `
        <tr>
          <td>${activity.activity_type || ''}</td>
          <td>${activity.activity_name || ''}</td>
          <td>${activity.level || ''}</td>
          <td>${activity.achievement || ''}</td>
          <td>${activity.year || ''}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  
  <div class="navy-divider"></div>
  
  <div class="section-header">APTITUDE & PROGRAMMING TEST SCORES</div>
  
  <table>
    <thead>
      <tr>
        <th>Year</th>
        <th>Semester</th>
        <th>Test #</th>
        <th>Type</th>
        <th>Score</th>
        <th>Max Score</th>
        <th>Date</th>
      </tr>
    </thead>
    <tbody>
      ${aptitudeScores.map((score: any) => `
        <tr>
          <td>${score.year || ''}</td>
          <td>${score.semester || ''}</td>
          <td>${score.test_number || ''}</td>
          <td>${score.test_type || ''}</td>
          <td>${score.score || ''}</td>
          <td>${score.max_score || ''}</td>
          <td>${formatDate(score.test_date)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
</div>`

  // PAGES 5-6 - INITIAL COUNSELLING QUESTIONNAIRE
  const iq = initialQuestionnaire
  if (!iq) {
    html += `
<div class="page">
  <div class="page-number">5</div>
  <div class="section-header">INITIAL COUNSELLING QUESTIONNAIRE (Answered Once — Semester 1)</div>
  <div style="text-align: center; margin-top: 80px; font-size: 14pt; color: #666;">Questionnaire not yet submitted.</div>
</div>`
  } else {
    // Clubs list for Q16 checkbox grid
    const allClubs = [
      'Photography Club', 'Music Club', 'Dance Club', 'Drama Club',
      'Literary Club', 'Debate Club', 'Quiz Club', 'Coding Club',
      'Robotics Club', 'Eco Club', 'Sports Club', 'Cultural Club',
      'IEEE', 'CSI', 'ACM', 'ISTE',
      'IE(India)', 'SAE', 'IETE', 'NSS',
      'NCC', 'Rotaract', 'Red Cross', 'Others'
    ]
    const selectedClubs: string[] = Array.isArray(iq.club_interests) ? iq.club_interests : []
    const selectedBodies: string[] = Array.isArray(iq.professional_body_interests) ? iq.professional_body_interests : []

    html += `
<div class="page">
  <div class="page-number">5</div>
  <div class="section-header">INITIAL COUNSELLING QUESTIONNAIRE (Answered Once — Semester 1)</div>
  
  <div style="margin: 8px 0;"><span class="section-number">1</span><strong>Transport & Logistics</strong></div>
  <table>
    <tbody>
      <tr><td style="width:60%;"><strong>Q1.</strong> Area of stay in Hyderabad</td><td>${iq.area_of_stay || ''}</td></tr>
      <tr><td><strong>Q2.</strong> Mode of transportation to college</td><td>${iq.transport_mode || ''}</td></tr>
      <tr><td><strong>Q3.</strong> Any inconvenience coming to college on time?</td><td>${iq.transport_inconvenience ? 'Yes' : 'No'}${iq.transport_inconvenience && iq.transport_inconvenience_details ? ' — ' + iq.transport_inconvenience_details : ''}</td></tr>
    </tbody>
  </table>
  
  <div class="navy-divider"></div>
  
  <div style="margin: 8px 0;"><span class="section-number">2</span><strong>Personal Background</strong></div>
  <table>
    <tbody>
      <tr><td style="width:60%;"><strong>Q4.</strong> Hobbies</td><td>${iq.hobbies || ''}</td></tr>
      <tr><td><strong>Q5.</strong> Difficulty with cleanliness/hygiene in institution</td><td>${iq.home_study_environment_ok ? 'No issues' : 'Yes — issues noted'}</td></tr>
      <tr><td><strong>Q6.</strong> Any health problems</td><td>${iq.health_issues || 'None'}</td></tr>
      <tr><td><strong>Q7.</strong> Is home atmosphere convenient for studies?</td><td>${iq.home_study_environment_ok ? 'Yes' : 'No'}${iq.home_study_environment_notes ? ' — ' + iq.home_study_environment_notes : ''}</td></tr>
      <tr><td><strong>Q8.</strong> Any issues hampering your studies?</td><td>${iq.study_issues || 'None'}</td></tr>
    </tbody>
  </table>
  
  <div class="navy-divider"></div>
  
  <div style="margin: 8px 0;"><span class="section-number">3</span><strong>Safety</strong></div>
  <table>
    <tbody>
      <tr><td style="width:60%;"><strong>Q9.</strong> Did you experience ragging?</td><td>${iq.ragging_experienced ? 'Yes' : 'No'}${iq.ragging_experienced && iq.ragging_details ? ' — ' + iq.ragging_details : ''}</td></tr>
      <tr><td><strong>Q10.</strong> Can college do anything to eliminate ragging?</td><td>${iq.ragging_suggestions || ''}</td></tr>
    </tbody>
  </table>
  
  <div class="navy-divider"></div>
  
  <div style="margin: 8px 0;"><span class="section-number">4</span><strong>Academic Awareness</strong></div>
  <table>
    <tbody>
      <tr><td style="width:60%;"><strong>Q11.</strong> Interested in Games/Sports?</td><td>${iq.interested_in_sports ? 'Yes' : 'No'}${iq.interested_in_sports && iq.sports_details ? ' — ' + iq.sports_details : ''}</td></tr>
      <tr><td><strong>Q12.</strong> Aware of Academic Regulations?</td><td>${iq.academic_regulation_aware ? 'Yes' : 'No'}</td></tr>
      <tr><td><strong>Q13.</strong> Did you inform parents about autonomous status?</td><td>${iq.parent_informed_autonomous ? 'Yes' : 'No'}</td></tr>
      <tr><td><strong>Q14a.</strong> Determined to become a Successful Engineer?</td><td>${iq.engineering_determination ? 'Yes' : 'No'}${iq.engineering_determination_reason ? ' — ' + iq.engineering_determination_reason : ''}</td></tr>
      <tr><td><strong>Q14b.</strong> Program Outcomes explained to mentee?</td><td>${iq.program_outcomes_explained ? 'Yes' : 'No'}</td></tr>
    </tbody>
  </table>
</div>`

    html += `
<div class="page">
  <div class="page-number">6</div>
  <div class="section-header">INITIAL COUNSELLING QUESTIONNAIRE (Continued)</div>
  
  <div style="margin: 8px 0;"><span class="section-number">5</span><strong>Co-Curricular</strong></div>
  <table>
    <tbody>
      <tr><td style="width:60%;"><strong>Q15.</strong> Interested in organizing curricular activities?</td><td>${iq.interested_in_organising_activities ? 'Yes' : 'No'}${iq.organising_details ? ' — ' + iq.organising_details : ''}</td></tr>
    </tbody>
  </table>
  
  <div style="margin: 8px 0; font-weight: bold; color: #1a3a6b;">Q16. Club Membership Interest</div>
  <div style="display: grid; grid-template-columns: repeat(6, 1fr); gap: 4px; margin: 8px 0; font-size: 9pt;">
    ${allClubs.map(club => `
      <div class="checkbox-item">${renderCheckbox(selectedClubs.includes(club))} ${club}</div>
    `).join('')}
  </div>
  
  <table>
    <tbody>
      <tr><td style="width:60%;"><strong>Q17.</strong> When to associate with clubs/professional bodies?</td><td>${iq.professional_body_membership_timeline || ''}</td></tr>
      <tr><td><strong>Q18.</strong> Professional bodies interest</td><td>${selectedBodies.length > 0 ? selectedBodies.join(', ') : 'None selected'}</td></tr>
    </tbody>
  </table>
  
  <div class="navy-divider"></div>
  
  <div style="margin: 8px 0;"><span class="section-number">6</span><strong>Soft Skills</strong></div>
  <table>
    <tbody>
      <tr><td style="width:60%;"><strong>Q19.</strong> Know benefits of Centre for Soft Skills Development?</td><td>${iq.soft_skills_centre_aware ? 'Yes' : 'No'}</td></tr>
    </tbody>
  </table>
  
  <div class="navy-divider"></div>
  
  <div style="margin: 8px 0;"><span class="section-number">7</span><strong>Self Assessment</strong></div>
  
  <div style="margin: 8px 0; font-weight: bold; color: #1a3a6b;">Q20. Strengths & Weaknesses</div>
  <div class="two-col">
    <div>
      <div style="font-weight: bold; margin-bottom: 4px;">Strengths:</div>
      <div style="border: 1px solid #ccc; padding: 8px; min-height: 40px;">${iq.strengths_text || ''}</div>
    </div>
    <div>
      <div style="font-weight: bold; margin-bottom: 4px;">Weaknesses:</div>
      <div style="border: 1px solid #ccc; padding: 8px; min-height: 40px;">${iq.weaknesses_text || ''}</div>
    </div>
  </div>
  
  <div style="margin: 8px 0; font-weight: bold; color: #1a3a6b;">Q21. Skill Self-Rating Rubric</div>
  <table class="radio-table">
    <thead>
      <tr>
        <th>Skill</th>
        <th>Excellent</th>
        <th>Very Good</th>
        <th>Good</th>
        <th>Satisfactory</th>
        <th>Unable to Judge</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="text-align: left;">Problem Solving</td>
        <td>${renderRadio(iq.skill_problem_solving, 'excellent')}</td>
        <td>${renderRadio(iq.skill_problem_solving, 'very_good')}</td>
        <td>${renderRadio(iq.skill_problem_solving, 'good')}</td>
        <td>${renderRadio(iq.skill_problem_solving, 'satisfactory')}</td>
        <td>${renderRadio(iq.skill_problem_solving, 'unable')}</td>
      </tr>
      <tr>
        <td style="text-align: left;">Communication</td>
        <td>${renderRadio(iq.skill_communication, 'excellent')}</td>
        <td>${renderRadio(iq.skill_communication, 'very_good')}</td>
        <td>${renderRadio(iq.skill_communication, 'good')}</td>
        <td>${renderRadio(iq.skill_communication, 'satisfactory')}</td>
        <td>${renderRadio(iq.skill_communication, 'unable')}</td>
      </tr>
      <tr>
        <td style="text-align: left;">Mathematics</td>
        <td>${renderRadio(iq.skill_mathematics, 'excellent')}</td>
        <td>${renderRadio(iq.skill_mathematics, 'very_good')}</td>
        <td>${renderRadio(iq.skill_mathematics, 'good')}</td>
        <td>${renderRadio(iq.skill_mathematics, 'satisfactory')}</td>
        <td>${renderRadio(iq.skill_mathematics, 'unable')}</td>
      </tr>
      <tr>
        <td style="text-align: left;">Inquisitiveness</td>
        <td>${renderRadio(iq.skill_inquisitiveness, 'excellent')}</td>
        <td>${renderRadio(iq.skill_inquisitiveness, 'very_good')}</td>
        <td>${renderRadio(iq.skill_inquisitiveness, 'good')}</td>
        <td>${renderRadio(iq.skill_inquisitiveness, 'satisfactory')}</td>
        <td>${renderRadio(iq.skill_inquisitiveness, 'unable')}</td>
      </tr>
      <tr>
        <td style="text-align: left;">Learning</td>
        <td>${renderRadio(iq.skill_learning, 'excellent')}</td>
        <td>${renderRadio(iq.skill_learning, 'very_good')}</td>
        <td>${renderRadio(iq.skill_learning, 'good')}</td>
        <td>${renderRadio(iq.skill_learning, 'satisfactory')}</td>
        <td>${renderRadio(iq.skill_learning, 'unable')}</td>
      </tr>
      <tr>
        <td style="text-align: left;">Innovation</td>
        <td>${renderRadio(iq.skill_innovation, 'excellent')}</td>
        <td>${renderRadio(iq.skill_innovation, 'very_good')}</td>
        <td>${renderRadio(iq.skill_innovation, 'good')}</td>
        <td>${renderRadio(iq.skill_innovation, 'satisfactory')}</td>
        <td>${renderRadio(iq.skill_innovation, 'unable')}</td>
      </tr>
    </tbody>
  </table>
  
  <table>
    <tbody>
      <tr><td style="width:60%;"><strong>Q22.</strong> Improvement efforts</td><td>${iq.improvement_efforts || ''}</td></tr>
      <tr><td><strong>Q23.</strong> What do you expect from the institution?</td><td>${iq.institution_expectation || ''}</td></tr>
    </tbody>
  </table>
</div>`
  }

  // PAGE 7 - GOALS DECLARATION
  const gd = goalsDeclaration || {}
  html += `
<div class="page">
  <div class="page-number">7</div>
  <div class="section-header">MY GOALS DECLARATION</div>
  
  <div style="margin: 12px 0;">
    <div style="font-weight: bold; color: #1a3a6b; margin-bottom: 8px;">Academic Goal</div>
    <div class="field-row">
      <div class="field-label">My Goal Is:</div>
      <div class="field-value">${gd.academic_goal || ''}</div>
    </div>
    <div class="field-row">
      <div class="field-label">Activities to Reach Goal:</div>
      <div class="field-value">${gd.academic_activities || ''}</div>
    </div>
    <div class="field-row">
      <div class="field-label">How I Know I've Reached It:</div>
      <div class="field-value">${gd.academic_success_indicator || ''}</div>
    </div>
  </div>
  
  <div class="navy-divider"></div>
  
  <div style="margin: 12px 0;">
    <div style="font-weight: bold; color: #1a3a6b; margin-bottom: 8px;">Personal Goal</div>
    <div class="field-row">
      <div class="field-label">My Goal Is:</div>
      <div class="field-value">${gd.personal_goal || ''}</div>
    </div>
    <div class="field-row">
      <div class="field-label">Activities to Reach Goal:</div>
      <div class="field-value">${gd.personal_activities || ''}</div>
    </div>
    <div class="field-row">
      <div class="field-label">How I Know I've Reached It:</div>
      <div class="field-value">${gd.personal_success_indicator || ''}</div>
    </div>
  </div>
  
  <div class="navy-divider"></div>
  
  <div style="margin: 12px 0;">
    <div style="font-weight: bold; color: #1a3a6b; margin-bottom: 8px;">Self-Knowledge</div>
    <div class="field-row">
      <div class="field-label">Two Best Talents:</div>
      <div class="field-value">${gd.talents || ''}</div>
    </div>
    <div class="field-row">
      <div class="field-label">Most Prized Possession:</div>
      <div class="field-value">${gd.possession || ''}</div>
    </div>
    <div class="field-row">
      <div class="field-label">Two Goals for This College Year:</div>
      <div class="field-value">${gd.college_goals || ''}</div>
    </div>
    <div class="field-row">
      <div class="field-label">I Am Proud Of:</div>
      <div class="field-value">${gd.proud_of || ''}</div>
    </div>
  </div>
  
  <div class="signature-block">
    <div>
      <div>Student Signature</div>
      <div class="signature-line">${profile?.name || ''}</div>
      <div style="font-size: 9pt; margin-top: 4px;">Date: ${formatDate(gd.created_at)}</div>
    </div>
    <div>
      <div>Mentor Signature</div>
      <div class="signature-line"></div>
    </div>
    <div>
      <div>Date</div>
      <div class="signature-line"></div>
    </div>
  </div>
</div>`

  // PAGE 8 - DETAILS OF MENTORS
  html += `
<div class="page">
  <div class="page-number">8</div>
  <div class="section-header">DETAILS OF MENTORS</div>
  
  <table>
    <thead>
      <tr>
        <th>Year</th>
        <th>Academic Year</th>
        <th>Mentor Name</th>
        <th>Designation</th>
        <th>Department</th>
        <th>Signature</th>
      </tr>
    </thead>
    <tbody>
      ${mentorAssignments.map((ma: any) => `
        <tr>
          <td>${ma.year || ''}</td>
          <td>${ma.academic_year || ''}</td>
          <td>${ma.mentor_name || ''}</td>
          <td>${ma.mentor_designation || ''}</td>
          <td>${ma.mentor_department || ''}</td>
          <td></td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  
  <div class="navy-divider"></div>
  
  <div class="section-header">MENTOR RESPONSIBILITIES</div>
  <ol style="margin: 8px 0; padding-left: 20px;">
    <li>Academic counselling and guidance</li>
    <li>Monitoring attendance and academic performance</li>
    <li>Identifying and addressing learning difficulties</li>
    <li>Career guidance and counselling</li>
    <li>Personal problem counselling</li>
    <li>Motivating students for excellence</li>
    <li>Co-curricular and extracurricular activity guidance</li>
    <li>Developing soft skills and personality</li>
    <li>Monitoring overall development of the student</li>
    <li>Regular interaction with parents</li>
    <li>Maintaining confidential records</li>
    <li>Reporting indisciplinary activities</li>
    <li>Guiding for competitive examinations</li>
    <li>Encouraging research and innovation</li>
    <li>Industry interaction guidance</li>
    <li>Placement guidance</li>
    <li>Higher studies guidance</li>
    <li>Entrepreneurship development</li>
    <li>Ethical and professional conduct guidance</li>
    <li>Time management guidance</li>
    <li>Stress management counselling</li>
    <li>Overall mentorship and support</li>
  </ol>
</div>`

  // PAGE 9-10 - MENTEE GUIDELINES
  html += `
<div class="page">
  <div class="page-number">9</div>
  <div class="section-header">GUIDELINES TO MENTEES</div>
  
  <div style="margin: 12px 0;">
    <p style="margin: 8px 0;">The mentoring programme is designed to provide comprehensive support to students throughout their academic journey. Each student is assigned a mentor who acts as a guide, counsellor, and facilitator for their overall development.</p>
  </div>
  
  <div style="margin: 12px 0;">
    <div style="font-weight: bold; color: #1a3a6b; margin-bottom: 8px;">Objectives of Mentoring Programme:</div>
    <ol style="margin: 8px 0; padding-left: 20px;">
      <li>To provide academic guidance and support</li>
      <li>To enhance personal and professional development</li>
      <li>To identify and address academic challenges</li>
      <li>To facilitate career planning and development</li>
      <li>To promote overall well-being of students</li>
      <li>To build confidence and self-esteem</li>
      <li>To develop soft skills and communication abilities</li>
      <li>To encourage participation in co-curricular activities</li>
      <li>To provide guidance for higher education</li>
      <li>To prepare students for industry requirements</li>
    </ol>
  </div>
  
  <div class="navy-divider"></div>
  
  <div style="margin: 12px 0;">
    <div style="font-weight: bold; color: #1a3a6b; margin-bottom: 8px;">Advantages of Mentoring:</div>
    <ul style="margin: 8px 0; padding-left: 20px;">
      <li>Personalized attention and guidance</li>
      <li>Early identification of academic issues</li>
      <li>Improved academic performance</li>
      <li>Better career planning and opportunities</li>
      <li>Enhanced personal development</li>
      <li>Stronger support system</li>
      <li>Industry exposure and guidance</li>
      <li>Networking opportunities</li>
      <li>Overall personality development</li>
      <li>Better preparation for future challenges</li>
    </ul>
  </div>
</div>`

  html += `
<div class="page">
  <div class="page-number">10</div>
  <div class="section-header">MENTEE RESPONSIBILITIES</div>
  
  <ol style="margin: 8px 0; padding-left: 20px;">
    <li>Attend all mentoring sessions regularly</li>
    <li>Maintain minimum 75% attendance</li>
    <li>Be punctual for all sessions</li>
    <li>Come prepared for mentoring sessions</li>
    <li>Share academic concerns openly</li>
    <li>Discuss personal issues if comfortable</li>
    <li>Follow mentor's guidance sincerely</li>
    <li>Maintain this diary properly</li>
    <li>Update records regularly</li>
    <li>Participate in suggested activities</li>
    <li>Work on identified areas of improvement</li>
    <li>Communicate with parents about mentoring</li>
    <li>Seek help when needed</li>
    <li>Provide feedback on mentoring programme</li>
    <li>Maintain confidentiality</li>
    <li>Respect mentor's time and guidance</li>
    <li>Set realistic goals and work towards them</li>
    <li>Develop self-discipline and time management</li>
    <li>Take responsibility for personal growth</li>
    <li>Maintain professional relationship with mentor</li>
  </ol>
</div>`

  // SESSION RECORDS
  let sessionPageNum = 11
  if (!sessions || sessions.length === 0) {
    html += `
<div class="page">
  <div class="page-number">${sessionPageNum++}</div>
  <div class="section-header">MENTORING SESSION RECORDS</div>
  <div style="text-align: center; margin-top: 80px; font-size: 14pt; color: #666;">No sessions recorded.</div>
</div>`
  }
  sessions.forEach((session: any) => {
    const sessionTasks = tasks.filter((t: any) => t.session_id === session.id)
    const sessionExtracurricular = extracurricularLog.filter((e: any) => e.session_id === session.id)
    const topics = session.topics_addressed || {}
    
    // Session header page
    html += `
<div class="page">
  <div class="page-number">${sessionPageNum++}</div>
  <div style="background: #000; color: #fff; padding: 10px 15px; font-family: Arial, sans-serif; font-weight: bold; font-size: 12pt; margin-bottom: 12px;">
    MENTORING #${session.session_number} — ${session.year_label || ''} — ${session.academic_year || ''}
  </div>
  
  <div style="display: flex; gap: 20px; margin-bottom: 12px; font-size: 10pt;">
    <div><strong>Date:</strong> ${formatDate(session.session_date)}</div>
    <div><strong>Attendance Above 90%:</strong> ${session.attendance_above_90 ? 'Yes' : 'No'}</div>
    <div><strong>Session Status:</strong> ${session.status || ''}</div>
  </div>
  
  <div class="two-col">
    <div>
      <div style="font-weight: bold; color: #1a3a6b; margin-bottom: 6px; font-family: Arial, sans-serif;">ISSUES CHECKLIST</div>
      <div class="checkbox-item">${renderCheckbox(topics.attendance)} 1. Attendance</div>
      <div class="checkbox-item">${renderCheckbox(topics.marks)} 2. Marks in Mid Examination(s)/Quiz/End Sem</div>
      <div class="checkbox-item">${renderCheckbox(topics.assignments)} 3. Non-submission of Assignments</div>
      <div class="checkbox-item">${renderCheckbox(topics.labs)} 4. Performance in Labs</div>
      <div class="checkbox-item">${renderCheckbox(topics.class_participation)} 5. Non-participation in class activities</div>
      <div class="checkbox-item">${renderCheckbox(topics.interest)} 6. Lack of interest in Engineering Course(s)</div>
      <div class="checkbox-item">${renderCheckbox(topics.motivation)} 7. Lack of Motivation to do well in academics</div>
    </div>
    <div>
      <div style="font-weight: bold; color: #1a3a6b; margin-bottom: 6px; font-family: Arial, sans-serif;">TOPICS ADDRESSED</div>
      <div class="checkbox-item">${renderCheckbox(topics.academic_counselling)} 1. Academic Counselling</div>
      <div class="checkbox-item">${renderCheckbox(topics.career_guidance)} 2. Career Guidance</div>
      <div class="checkbox-item">${renderCheckbox(topics.personal_issues)} 3. Personal Issues</div>
      <div class="checkbox-item">${renderCheckbox(topics.time_management)} 4. Time Management</div>
      <div class="checkbox-item">${renderCheckbox(topics.study_skills)} 5. Study Skills</div>
      <div class="checkbox-item">${renderCheckbox(topics.extracurricular)} 6. Co-Curricular Activities</div>
      <div class="checkbox-item">${renderCheckbox(topics.placement_prep)} 7. Placement Preparation</div>
      <div class="checkbox-item">${renderCheckbox(topics.other)} 8. Other Topics</div>
    </div>
  </div>
  
  <div class="navy-divider"></div>
  
  <div style="font-weight: bold; color: #1a3a6b; margin: 8px 0; font-family: Arial, sans-serif;">COURSE SELF-ASSESSMENT</div>
  <table>
    <thead>
      <tr>
        <th>Course Name</th>
        <th>Difficulty (1-5)</th>
        <th>Teacher Informed</th>
        <th>Faculty Response</th>
      </tr>
    </thead>
    <tbody>
      ${(session.courseRatings || []).map((cr: any) => `
        <tr>
          <td>${cr.course_name || ''}</td>
          <td>${cr.difficulty_scale || ''}</td>
          <td>${cr.teacher_informed ? 'Yes' : 'No'}</td>
          <td>${cr.faculty_response || ''}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  
  <div class="navy-divider"></div>
  
  <div style="font-weight: bold; color: #1a3a6b; margin: 8px 0; font-family: Arial, sans-serif;">CO-CURRICULAR ACTIVITIES THIS SESSION</div>
  <table>
    <thead>
      <tr>
        <th>S.No</th>
        <th>Skill Area</th>
        <th>Activity</th>
        <th>Organized/Participated</th>
        <th>Details</th>
      </tr>
    </thead>
    <tbody>
      ${sessionExtracurricular.map((ec: any, idx: number) => `
        <tr>
          <td>${idx + 1}</td>
          <td>${ec.skill_area || ''}</td>
          <td>${ec.activity || ''}</td>
          <td>${ec.participation_type || ''}</td>
          <td>${ec.details || ''}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
</div>`

    // Session continuation page
    html += `
<div class="page">
  <div class="page-number">${sessionPageNum++}</div>
  <div style="background: #000; color: #fff; padding: 8px 15px; font-family: Arial, sans-serif; font-size: 10pt; margin-bottom: 12px;">
    MENTORING #${session.session_number} — CONTINUED
  </div>
  
  <div style="font-weight: bold; color: #1a3a6b; margin: 8px 0; font-family: Arial, sans-serif;">FACILITY FEEDBACK</div>
  <table>
    <thead>
      <tr>
        <th>Facility</th>
        <th>Mentee's Remarks</th>
      </tr>
    </thead>
    <tbody>
      ${session.facilityFeedback ? `
        <tr><td>Canteen</td><td>${session.facilityFeedback.canteen_remarks || ''}</td></tr>
        <tr><td>College Transport</td><td>${session.facilityFeedback.transport_remarks || ''}</td></tr>
        <tr><td>Ragging</td><td>${session.facilityFeedback.ragging_remarks || ''}</td></tr>
        <tr><td>Sanitation</td><td>${session.facilityFeedback.sanitation_remarks || ''}</td></tr>
        <tr><td>Library</td><td>${session.facilityFeedback.library_remarks || ''}</td></tr>
        <tr><td>Laboratories</td><td>${session.facilityFeedback.lab_remarks || ''}</td></tr>
      ` : ''}
    </tbody>
  </table>
  
  <div class="navy-divider"></div>
  
  <div style="font-weight: bold; color: #1a3a6b; margin: 8px 0; font-family: Arial, sans-serif;">FORTNIGHTLY ATTENDANCE LOG</div>
  <table>
    <thead>
      <tr>
        <th>Fortnight #</th>
        <th>Duration</th>
        <th>Attendance %</th>
        <th>Remarks</th>
        <th>Parent Informed</th>
        <th>Parent's Response</th>
      </tr>
    </thead>
    <tbody>
      ${(session.attendance || []).map((att: any) => `
        <tr class="${att.attendance_percentage && att.attendance_percentage < 75 ? 'highlight-red' : ''}">
          <td>${att.fortnight_number || ''}</td>
          <td>${att.period_start ? formatDate(att.period_start) : ''} - ${att.period_end ? formatDate(att.period_end) : ''}</td>
          <td>${att.attendance_percentage || ''}%</td>
          <td>${att.remarks || ''}</td>
          <td>${att.parent_informed ? 'Y (' + formatDate(att.parent_informed_date) + ')' : 'N'}</td>
          <td>${att.parent_response || ''}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  
  ${session.indisciplinary_activity ? `
    <div class="indisciplinary-flag">
      <div class="indisciplinary-flag-header">⚠ INDISCIPLINARY ACTIVITY FLAGGED</div>
      <div>${session.indisciplinary_details || ''}</div>
    </div>
  ` : ''}
  
  <div class="navy-divider"></div>
  
  <div style="font-weight: bold; color: #1a3a6b; margin: 8px 0; font-family: Arial, sans-serif;">MENTOR'S OBSERVATION</div>
  <div class="lined-textarea">${session.mentor_observation || ''}</div>
  
  <div style="font-weight: bold; color: #1a3a6b; margin: 8px 0; font-family: Arial, sans-serif;">RECOMMENDATION</div>
  <div class="lined-textarea">${session.recommendation || ''}</div>
  
  ${sessionTasks.length > 0 ? `
    <div class="ai-insights">
      <div class="ai-insights-header">AI-Generated — Mentor Verified</div>
      <div style="margin-bottom: 8px;"><strong>Key Tasks Assigned:</strong></div>
      <ul style="margin: 4px 0; padding-left: 20px;">
        ${sessionTasks.map((t: any) => `<li>${t.description || ''} (Due: ${formatDate(t.due_date)}) - ${t.status || ''}</li>`).join('')}
      </ul>
    </div>
  ` : ''}
  
  <div class="signature-block">
    <div>
      <div>Mentee</div>
      <div class="signature-line">${profile?.name || ''}</div>
      <div style="font-size: 9pt; margin-top: 4px;">${formatDate(session.student_acknowledged_at)}</div>
    </div>
    <div>
      <div>Mentor</div>
      <div class="signature-line">${session.mentor_name || ''}</div>
      <div style="font-size: 9pt; margin-top: 4px;">${formatDate(session.mentor_signed_off_at)}</div>
    </div>
    <div>
      <div>Coordinator/HOD</div>
      <div class="signature-line"></div>
    </div>
  </div>
</div>`

    // Impact Assessment page (if session_number > 1)
    if (session.session_number > 1 && session.impactAssessment) {
      const ia = session.impactAssessment
      html += `
<div class="page">
  <div class="page-number">${sessionPageNum++}</div>
  <div class="section-header">IMPACT ASSESSMENT — MENTORING #${session.session_number}</div>
  
  <div style="font-weight: bold; color: #1a3a6b; margin: 8px 0; font-family: Arial, sans-serif;">Table A — Skill Improvement</div>
  <table>
    <thead>
      <tr>
        <th>S.No</th>
        <th>Skill Area</th>
        <th>Improvement: Yes ☐</th>
        <th>Improvement: No ☐</th>
        <th>Insignificant ☐</th>
        <th>Mentor's Suggestions</th>
      </tr>
    </thead>
    <tbody>
      ${['Academic Performance', 'Communication Skills', 'Time Management', 'Problem Solving', 'Team Work', 'Leadership', 'Confidence'].map((skill, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td>${skill}</td>
          <td>${renderCheckbox(ia['skill_' + idx + '_improvement'] === 'yes')}</td>
          <td>${renderCheckbox(ia['skill_' + idx + '_improvement'] === 'no')}</td>
          <td>${renderCheckbox(ia['skill_' + idx + '_improvement'] === 'insignificant')}</td>
          <td>${ia['skill_' + idx + '_suggestions'] || ''}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  
  <div class="navy-divider"></div>
  
  <div style="font-weight: bold; color: #1a3a6b; margin: 8px 0; font-family: Arial, sans-serif;">Table B — Transformation Analysis</div>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Question</th>
        <th>Y ☐</th>
        <th>N ☐</th>
        <th>Insignificant/NA ☐</th>
      </tr>
    </thead>
    <tbody>
      ${['Improved attendance?', 'Better academic performance?', 'More confident?', 'Better time management?', 'Improved communication?', 'More participative?', 'Clearer career goals?', 'Better problem-solving?', 'Overall positive change?'].map((q, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td>${q}</td>
          <td>${renderCheckbox(ia['transformation_' + idx] === 'yes')}</td>
          <td>${renderCheckbox(ia['transformation_' + idx] === 'no')}</td>
          <td>${renderCheckbox(ia['transformation_' + idx] === 'insignificant')}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
</div>`
    }

    // Career Counselling page (if exists)
    if (session.careerCounselling) {
      const cc = session.careerCounselling
      html += `
<div class="page">
  <div class="page-number">${sessionPageNum++}</div>
  <div class="section-header">CAREER COUNSELLING QUESTIONNAIRE — MENTORING #${session.session_number}</div>
  
  <div class="accordion-box">
    <div class="accordion-header">Section 1: MS/Higher Studies — USA</div>
    <div class="accordion-content">
      <div class="checkbox-item">${renderCheckbox(cc.usa_interested)} Interested in MS in USA?</div>
      <div class="checkbox-item">${renderCheckbox(cc.usa_gre_taken)} GRE taken/planned?</div>
      <div class="checkbox-item">${renderCheckbox(cc.usa_toefl_taken)} TOEFL/IELTS taken/planned?</div>
      <div class="checkbox-item">${renderCheckbox(cc.usa_research)} Research experience?</div>
      <div class="checkbox-item">${renderCheckbox(cc.usa_funding)} Funding concerns?</div>
    </div>
  </div>
  
  <div class="accordion-box">
    <div class="accordion-header">Section 2: MS/Higher Studies — Other Countries</div>
    <div class="accordion-content">
      <div class="checkbox-item">${renderCheckbox(cc.other_interested)} Interested in other countries?</div>
      <div class="checkbox-item">${renderCheckbox(cc.other_countries)} Which countries? ${cc.other_countries_list || ''}</div>
    </div>
  </div>
  
  <div class="accordion-box">
    <div class="accordion-header">Section 3: Higher Studies in India (GATE/GRE-I)</div>
    <div class="accordion-content">
      <div class="checkbox-item">${renderCheckbox(cc.gate_interested)} Interested in GATE?</div>
      <div class="checkbox-item">${renderCheckbox(cc.gre_india_interested)} Interested in GRE for India?</div>
    </div>
  </div>
  
  <div class="accordion-box">
    <div class="accordion-header">Section 4: M.Tech in India</div>
    <div class="accordion-content">
      <div class="checkbox-item">${renderCheckbox(cc.mtech_interested)} Interested in M.Tech?</div>
      <div class="checkbox-item">${renderCheckbox(cc.mtech_specialization)} Specialization: ${cc.mtech_specialization_field || ''}</div>
    </div>
  </div>
  
  <div class="accordion-box">
    <div class="accordion-header">Section 5: MBA in India</div>
    <div class="accordion-content">
      <div class="checkbox-item">${renderCheckbox(cc.mba_interested)} Interested in MBA?</div>
      <div class="checkbox-item">${renderCheckbox(cc.cat_taken)} CAT taken/planned?</div>
    </div>
  </div>
  
  <div class="accordion-box">
    <div class="accordion-header">Section 6: Job</div>
    <div class="accordion-content">
      <div class="checkbox-item">${renderCheckbox(cc.job_interested)} Interested in campus placement?</div>
      <div class="checkbox-item">${renderCheckbox(cc.job_off_campus)} Open to off-campus?</div>
      <div class="checkbox-item">${renderCheckbox(cc.job_startup)} Interested in startups?</div>
    </div>
  </div>
  
  <div class="navy-divider"></div>
  
  <div style="font-weight: bold; color: #1a3a6b; margin: 8px 0; font-family: Arial, sans-serif;">Mentor Summary</div>
  <div class="lined-textarea">${cc.mentor_summary || ''}</div>
</div>`
    }
  })

  // PORTFOLIO RUBRIC PAGES
  const semesters = [...new Set(portfolioRatings.map((pr: any) => pr.semester_label))]
  semesters.forEach((sem) => {
    const semRatings = portfolioRatings.filter((pr: any) => pr.semester_label === sem)
    const artifactTypes = ['Academic Projects', 'Internship Reports', 'Research Papers', 'Conference Presentations', 'Technical Workshops', 'Certifications', 'Competitions Won', 'Leadership Roles', 'Social Service', 'Sports Achievements', 'Cultural Events', 'Industry Visits', 'Online Courses', 'Hackathons', 'Innovation Projects', 'Other Achievements']
    
    html += `
<div class="page">
  <div class="page-number">${sessionPageNum++}</div>
  <div class="section-header">STUDENT PORTFOLIO — ${sem}</div>
  
  <table>
    <thead>
      <tr>
        <th>S.No</th>
        <th>Artifact / Evidence Type</th>
        <th>Rating</th>
        <th>Graduate Attributes</th>
        <th>Program Outcomes</th>
        <th>Evidence Description</th>
      </tr>
    </thead>
    <tbody>
      ${artifactTypes.map((type, idx) => {
        const rating = semRatings.find((r: any) => r.artifact_type === type)
        return `
          <tr>
            <td>${idx + 1}</td>
            <td>${type}</td>
            <td>${rating?.rating || ''}</td>
            <td>${rating?.graduate_attributes || ''}</td>
            <td>${rating?.program_outcomes || ''}</td>
            <td>${rating?.evidence_description || ''}</td>
          </tr>
        `
      }).join('')}
    </tbody>
  </table>
  
  <div class="navy-divider"></div>
  
  <div style="font-size: 9pt; color: #1a3a6b;">
    <strong>PO Mapping Key:</strong> PO1-Engineering Knowledge, PO2-Problem Analysis, PO3-Design/Development, PO4-Conduct Investigations, PO5-Modern Tool Usage, PO6-Engineer & Society, PO7-Environment & Sustainability, PO8-Ethics, PO9-Individual & Team Work, PO10-Communication, PO11-Project Management
  </div>
</div>`
  })

  // SUPPLEMENTARY EXAM / BACKLOG DETAILS
  if (backlogRecords && backlogRecords.length > 0) {
    html += `
<div class="page">
  <div class="page-number">${sessionPageNum++}</div>
  <div class="section-header">SUPPLEMENTARY EXAM / BACKLOG DETAILS</div>
  
  <table>
    <thead>
      <tr>
        <th>Course Name</th>
        <th>Course Code</th>
        <th>Year/Sem</th>
        <th>Attempt 1 (Month/Grade/Result)</th>
        <th>Attempt 2</th>
        <th>Attempt 3</th>
        <th>Attempt 4</th>
        <th>Remarks</th>
      </tr>
    </thead>
    <tbody>
      ${backlogRecords.map((br: any) => `
        <tr>
          <td>${br.course_name || ''}</td>
          <td>${br.course_code || ''}</td>
          <td>${br.year_sem || ''}</td>
          <td class="${br.attempt1_result === 'Fail' ? 'highlight-red' : br.attempt1_result === 'Pass' ? 'highlight-green' : ''}">${br.attempt1_month || ''} / ${br.attempt1_grade || ''} / ${br.attempt1_result || ''}</td>
          <td class="${br.attempt2_result === 'Fail' ? 'highlight-red' : br.attempt2_result === 'Pass' ? 'highlight-green' : ''}">${br.attempt2_month || ''} / ${br.attempt2_grade || ''} / ${br.attempt2_result || ''}</td>
          <td class="${br.attempt3_result === 'Fail' ? 'highlight-red' : br.attempt3_result === 'Pass' ? 'highlight-green' : ''}">${br.attempt3_month || ''} / ${br.attempt3_grade || ''} / ${br.attempt3_result || ''}</td>
          <td class="${br.attempt4_result === 'Fail' ? 'highlight-red' : br.attempt4_result === 'Pass' ? 'highlight-green' : ''}">${br.attempt4_month || ''} / ${br.attempt4_grade || ''} / ${br.attempt4_result || ''}</td>
          <td>${br.remarks || ''}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
</div>`
  }

  // AI SUMMARY DASHBOARD
  const latestCGPA = semesterResults[semesterResults.length - 1]?.cgpa || 'N/A'
  const latestAttendance = sessions.length > 0 ? sessions[sessions.length - 1].attendance_percentage : 'N/A'
  const activeBacklogs = backlogRecords?.filter((br: any) => br.attempt4_result === 'Fail').length || 0
  const completedTasks = tasks.filter((t: any) => t.status === 'completed').length
  const pendingTasks = tasks.filter((t: any) => t.status !== 'completed').length
  const latestCareer = sessions.length > 0 ? sessions[sessions.length - 1].careerCounselling : null

  html += `
<div class="page">
  <div class="page-number">${sessionPageNum++}</div>
  <div class="ai-insights" style="background-color: #e8f0f8; border: 2px solid #1a3a6b;">
    <div class="ai-insights-header" style="font-size: 12pt;">DIGITAL PLATFORM — AI-GENERATED SUMMARY (Not in Physical Diary)</div>
    
    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-top: 16px;">
      <div style="background: #fff; padding: 12px; border-radius: 4px; border: 1px solid #ccc;">
        <div style="font-weight: bold; color: #1a3a6b; font-family: Arial, sans-serif;">Total Sessions Completed</div>
        <div style="font-size: 24pt; font-weight: bold; color: #c8a84b;">${sessions.length}</div>
      </div>
      <div style="background: #fff; padding: 12px; border-radius: 4px; border: 1px solid #ccc;">
        <div style="font-weight: bold; color: #1a3a6b; font-family: Arial, sans-serif;">Latest CGPA</div>
        <div style="font-size: 24pt; font-weight: bold; color: #c8a84b;">${latestCGPA}</div>
        <div style="font-size: 9pt; color: #666;">${semesterResults.length > 1 ? 'Trend: ' + (semesterResults[semesterResults.length - 1].cgpa > semesterResults[semesterResults.length - 2].cgpa ? '↑ Improving' : '↓ Needs Attention') : ''}</div>
      </div>
      <div style="background: #fff; padding: 12px; border-radius: 4px; border: 1px solid #ccc;">
        <div style="font-weight: bold; color: #1a3a6b; font-family: Arial, sans-serif;">Latest Attendance</div>
        <div style="font-size: 24pt; font-weight: bold; color: ${latestAttendance !== 'N/A' && latestAttendance < 75 ? '#d32f2f' : '#c8a84b'};">${latestAttendance}%</div>
      </div>
      <div style="background: #fff; padding: 12px; border-radius: 4px; border: 1px solid #ccc;">
        <div style="font-weight: bold; color: #1a3a6b; font-family: Arial, sans-serif;">Active Backlogs</div>
        <div style="font-size: 24pt; font-weight: bold; color: ${activeBacklogs > 0 ? '#d32f2f' : '#c8a84b'};">${activeBacklogs}</div>
      </div>
      <div style="background: #fff; padding: 12px; border-radius: 4px; border: 1px solid #ccc;">
        <div style="font-weight: bold; color: #1a3a6b; font-family: Arial, sans-serif;">Tasks Status</div>
        <div style="font-size: 18pt; font-weight: bold; color: #c8a84b;">${completedTasks} Completed / ${pendingTasks} Pending</div>
      </div>
      <div style="background: #fff; padding: 12px; border-radius: 4px; border: 1px solid #ccc;">
        <div style="font-weight: bold; color: #1a3a6b; font-family: Arial, sans-serif;">Career Pathway</div>
        <div style="font-size: 14pt; font-weight: bold; color: #1a3a6b;">${latestCareer ? (latestCareer.job_interested ? 'Campus Placement' : latestCareer.gate_interested ? 'Higher Studies (GATE)' : latestCareer.usa_interested ? 'Higher Studies (USA)' : 'Exploring Options') : 'Not Yet Decided'}</div>
      </div>
    </div>
    
    <div style="margin-top: 16px; background: #fff; padding: 12px; border-radius: 4px; border: 1px solid #ccc;">
      <div style="font-weight: bold; color: #1a3a6b; font-family: Arial, sans-serif; margin-bottom: 8px;">Risk Level Summary</div>
      <div style="font-size: 11pt;">
        ${activeBacklogs > 2 || latestAttendance !== 'N/A' && latestAttendance < 60 ? 
          '<span style="color: #d32f2f; font-weight: bold;">HIGH RISK — Immediate intervention required</span>' : 
          activeBacklogs > 0 || latestAttendance !== 'N/A' && latestAttendance < 75 ? 
          '<span style="color: #f57c00; font-weight: bold;">MEDIUM RISK — Monitor closely</span>' : 
          '<span style="color: #388e3c; font-weight: bold;">LOW RISK — On track</span>'}
      </div>
    </div>
  </div>
</div>`

  html += `
</body>
</html>`

  return html
}
