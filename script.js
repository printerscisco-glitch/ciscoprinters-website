// ============================================
// 🗄️ SUPABASE CLIENT CONFIGURATION
// ============================================

// Supabase credentials (from Vercel environment variables)
const supabaseUrl = 'https://db.bjvrfksdmloygkaadfsl.supabase.co';
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY'; // REPLACE WITH YOUR ACTUAL KEY

console.log('🗄️ Supabase URL:', supabaseUrl);
console.log('🔑 Supabase Key:', supabaseKey ? '✅ Loaded' : '❌ Missing');

// Helper function for Supabase REST API
async function supabaseRequest(endpoint, method = 'GET', data = null) {
    const options = {
        method: method,
        headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
        }
    };
    
    if (data) {
        options.body = JSON.stringify(data);
    }
    
    try {
        const response = await fetch(`${supabaseUrl}${endpoint}`, options);
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Supabase error (${response.status}): ${errorText}`);
        }
        
        return response.json();
    } catch (error) {
        console.error('Supabase request failed:', error);
        throw error;
    }
}

// ============================================
// 📱 MOBILE HAMBURGER MENU
// ============================================

const hamburger = document.getElementById('hamburger');
const navLinks = document.getElementById('navLinks');

hamburger.addEventListener('click', () => {
    navLinks.classList.toggle('active');
});

document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', () => {
        navLinks.classList.remove('active');
    });
});

// ============================================
// 🖨️ PRINT UPLOAD SYSTEM
// ============================================

let selectedFiles = [];

document.getElementById('fileInput').addEventListener('change', function(e) {
    selectedFiles = Array.from(this.files);
    updateFileList();
    updateCostEstimate();
});

const dropArea = document.getElementById('dropArea');

dropArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropArea.style.borderColor = '#f47b20';
    dropArea.style.background = '#fde8d6';
});

dropArea.addEventListener('dragleave', () => {
    dropArea.style.borderColor = '#f47b20';
    dropArea.style.background = 'white';
});

dropArea.addEventListener('drop', (e) => {
    e.preventDefault();
    dropArea.style.borderColor = '#f47b20';
    dropArea.style.background = 'white';
    selectedFiles = Array.from(e.dataTransfer.files);
    updateFileList();
    updateCostEstimate();
});

function updateFileList() {
    const fileList = document.getElementById('fileList');
    if (selectedFiles.length === 0) {
        fileList.innerHTML = '';
        return;
    }
    fileList.innerHTML = selectedFiles.map((file, index) => `
        <div class="file-item">
            <span><i class="fas fa-file"></i> ${file.name} (${(file.size / 1024).toFixed(1)} KB)</span>
            <span class="remove-file" onclick="removeFile(${index})">✕</span>
        </div>
    `).join('');
}

function removeFile(index) {
    selectedFiles.splice(index, 1);
    updateFileList();
    updateCostEstimate();
    document.getElementById('fileInput').value = '';
}

function updateCostEstimate() {
    const pages = parseInt(document.getElementById('pagesPerCopy').value) || 1;
    const copies = parseInt(document.getElementById('copies').value) || 1;
    const colorMode = document.getElementById('printColor').value;
    const pricePerPage = colorMode === 'bw' ? 10 : 30;
    const totalPages = selectedFiles.length * pages * copies;
    const total = totalPages * pricePerPage;
    document.getElementById('estimatedCost').textContent = `KES ${total}`;
}

document.getElementById('pagesPerCopy').addEventListener('change', updateCostEstimate);
document.getElementById('copies').addEventListener('change', updateCostEstimate);
document.getElementById('printColor').addEventListener('change', updateCostEstimate);

// ============================================
// 📤 SUBMIT PRINT JOB TO SUPABASE
// ============================================

async function submitPrintJob(event) {
    event.preventDefault();
    const message = document.getElementById('printMessage');

    if (selectedFiles.length === 0) {
        message.textContent = '⚠️ Please upload at least one file to print.';
        message.className = 'form-message error';
        message.style.display = 'block';
        return;
    }

    const pages = parseInt(document.getElementById('pagesPerCopy').value) || 1;
    const copies = parseInt(document.getElementById('copies').value) || 1;
    const colorMode = document.getElementById('printColor').value;
    const pricePerPage = colorMode === 'bw' ? 10 : 30;
    const totalPages = selectedFiles.length * pages * copies;
    const total = totalPages * pricePerPage;

    const name = document.getElementById('bookingName')?.value || 'Guest';
    const phone = document.getElementById('bookingPhone')?.value || '+254769357320';

    message.textContent = '⏳ Submitting your print job...';
    message.className = 'form-message';
    message.style.display = 'block';

    try {
        const printData = {
            customer_name: name,
            customer_phone: phone,
            file_names: selectedFiles.map(f => f.name),
            file_sizes: selectedFiles.map(f => `${(f.size / 1024).toFixed(1)}KB`),
            pages_per_copy: pages,
            copies: copies,
            color_mode: colorMode,
            total_pages: totalPages,
            total_cost: total,
            status: 'pending'
        };

        const data = await supabaseRequest('/rest/v1/print_orders', 'POST', printData);

        message.innerHTML = `
            ✅ Print job submitted successfully!<br>
            <strong>Order ID:</strong> ${data[0]?.id || 'N/A'}<br>
            <strong>Files:</strong> ${selectedFiles.length}<br>
            <strong>Total Pages:</strong> ${totalPages}<br>
            <strong>Total Cost:</strong> KES ${total}<br>
            <small>We'll prepare your documents and contact you.</small>
        `;
        message.className = 'form-message success';
        message.style.display = 'block';

        await addLoyaltyPoints(phone, 5);

        if (typeof gtag !== 'undefined') {
            gtag('event', 'print_job_submitted', {
                'event_category': 'Printing',
                'event_label': `${selectedFiles.length} files, KES ${total}`
            });
        }

    } catch (error) {
        console.error('Submission error:', error);
        message.innerHTML = `
            ❌ Error submitting print job.<br>
            Please contact us directly at <strong>+254 769 357 320</strong>
        `;
        message.className = 'form-message error';
        message.style.display = 'block';
    }

    selectedFiles = [];
    updateFileList();
    document.getElementById('fileInput').value = '';
    updateCostEstimate();

    setTimeout(() => {
        message.style.display = 'none';
    }, 10000);
}

// ============================================
// 📅 BOOKING SYSTEM WITH SUPABASE
// ============================================

document.getElementById('bookingComputer').addEventListener('change', updateBookingCost);
document.getElementById('bookingHours').addEventListener('input', updateBookingCost);

function updateBookingCost() {
    const computer = document.getElementById('bookingComputer').value;
    const hours = parseInt(document.getElementById('bookingHours').value) || 0;
    const rates = { '1': 50, '2': 50, '3': 50, '4': 50, 'gaming': 100 };
    const rate = rates[computer] || 0;
    const total = rate * hours;
    document.getElementById('bookingCost').textContent = `KES ${total}`;
}

async function submitBooking(event) {
    event.preventDefault();
    const message = document.getElementById('bookingMessage');

    const computer = document.getElementById('bookingComputer').value;
    const dateTime = document.getElementById('bookingDateTime').value;
    const hours = parseInt(document.getElementById('bookingHours').value) || 0;
    const name = document.getElementById('bookingName').value;
    const phone = document.getElementById('bookingPhone').value;
    const email = document.getElementById('bookingEmail').value;

    const rates = { '1': 50, '2': 50, '3': 50, '4': 50, 'gaming': 100 };
    const rate = rates[computer] || 0;
    const total = rate * hours;

    message.textContent = '⏳ Confirming your booking...';
    message.className = 'form-message';
    message.style.display = 'block';

    try {
        const bookingData = {
            customer_name: name,
            customer_phone: phone,
            customer_email: email || null,
            computer: computer === 'gaming' ? 'Gaming PC' : `Computer ${computer}`,
            booking_date: dateTime,
            hours: hours,
            total_cost: total,
            status: 'confirmed'
        };

        const data = await supabaseRequest('/rest/v1/bookings', 'POST', bookingData);

        const formattedDate = new Date(dateTime).toLocaleString('en-KE', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        message.innerHTML = `
            ✅ Booking confirmed!<br>
            <strong>Booking ID:</strong> ${data[0]?.id || 'N/A'}<br>
            <strong>Computer:</strong> ${computer === 'gaming' ? 'Gaming PC' : 'Computer ' + computer}<br>
            <strong>Date & Time:</strong> ${formattedDate}<br>
            <strong>Hours:</strong> ${hours}<br>
            <strong>Total Cost:</strong> KES ${total}<br>
            <small>Please arrive 5 minutes before your booking.</small>
        `;
        message.className = 'form-message success';
        message.style.display = 'block';

        await addLoyaltyPoints(phone, 10);

        if (typeof gtag !== 'undefined') {
            gtag('event', 'computer_booking', {
                'event_category': 'Booking',
                'event_label': `Computer ${computer}, ${hours}h, KES ${total}`
            });
        }

    } catch (error) {
        console.error('Booking error:', error);
        message.innerHTML = `
            ❌ Error confirming booking.<br>
            Please call <strong>+254 769 357 320</strong> to book.
        `;
        message.className = 'form-message error';
        message.style.display = 'block';
    }

    document.getElementById('bookingForm').reset();
    document.getElementById('bookingCost').textContent = 'KES 0';

    setTimeout(() => {
        message.style.display = 'none';
    }, 8000);
}

// ============================================
// ⭐ LOYALTY PROGRAM WITH SUPABASE
// ============================================

async function addLoyaltyPoints(phone, points) {
    try {
        // Check if user exists
        const existing = await supabaseRequest(`/rest/v1/loyalty?phone=eq.${encodeURIComponent(phone)}`, 'GET');

        if (existing.length > 0) {
            // Update existing
            await supabaseRequest(`/rest/v1/loyalty?id=eq.${existing[0].id}`, 'PATCH', {
                points: existing[0].points + points,
                visits: existing[0].visits + 1,
                last_visit: new Date().toISOString()
            });
        } else {
            // Create new
            await supabaseRequest('/rest/v1/loyalty', 'POST', {
                phone: phone,
                points: points,
                visits: 1,
                last_visit: new Date().toISOString()
            });
        }
    } catch (error) {
        console.error('Loyalty error:', error);
    }
}

async function checkPoints() {
    const phone = document.getElementById('pointsPhone').value.trim();
    const result = document.getElementById('pointsResult');

    if (!phone) {
        result.textContent = '⚠️ Please enter your phone number.';
        result.className = 'points-result error show';
        return;
    }

    try {
        const data = await supabaseRequest(`/rest/v1/loyalty?phone=eq.${encodeURIComponent(phone)}`, 'GET');

        if (data.length === 0) {
            result.innerHTML = `
                No points found for ${phone}.<br>
                <small>Earn points by using our services!</small>
            `;
            result.className = 'points-result error show';
            return;
        }

        const user = data[0];
        const points = user.points;
        const visits = user.visits;
        const lastVisit = new Date(user.last_visit).toLocaleDateString();

        let rewardMessage = '';
        if (points >= 500) rewardMessage = '🏆 Eligible for FREE Passport Photos!';
        else if (points >= 200) rewardMessage = '🎁 Eligible for FREE 2 hours Computer Rental!';
        else if (points >= 100) rewardMessage = '🎁 Eligible for FREE 10 pages Printing!';
        else if (points >= 50) rewardMessage = '🎁 Eligible for FREE 1 hour Internet!';
        else rewardMessage = `📈 ${50 - points} more points for first reward!`;

        result.innerHTML = `
            <strong>📞 ${phone}</strong><br>
            ⭐ Points: <strong>${points}</strong><br>
            📊 Total Visits: ${visits}<br>
            📅 Last Visit: ${lastVisit}<br>
            🎯 ${rewardMessage}
        `;
        result.className = 'points-result success show';

    } catch (error) {
        console.error('Check points error:', error);
        result.textContent = '❌ Error checking points. Please try again.';
        result.className = 'points-result error show';
    }
}

// ============================================
// 📧 CONTACT FORM
// ============================================

const contactForm = document.getElementById('contactForm');
const formMessage = document.getElementById('formMessage');

contactForm.addEventListener('submit', function(e) {
    e.preventDefault();
    formMessage.textContent = '✅ Thank you! We will get back to you soon.';
    formMessage.className = 'form-message success';
    formMessage.style.display = 'block';
    this.reset();
    setTimeout(() => {
        formMessage.style.display = 'none';
    }, 5000);
});

// ============================================
// 🎯 SCROLL ANIMATIONS
// ============================================

const cards = document.querySelectorAll('.service-card, .pricing-card, .testimonial-card, .about-content, .print-grid, .booking-grid, .loyalty-grid');

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, { threshold: 0.1 });

cards.forEach(card => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(30px)';
    card.style.transition = '0.6s ease';
    observer.observe(card);
});

// ============================================
// 📱 SMOOTH SCROLL
// ============================================

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
});

console.log('🚀 Cisco Printers Cybercafe - Baraton, Nandi');
console.log('🗄️ Supabase connected!');
console.log('📧 info@ciscoprinters.co.ke');