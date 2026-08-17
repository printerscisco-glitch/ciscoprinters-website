// ===== MOBILE HAMBURGER MENU =====
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

// ===== ACTIVE NAV LINK ON SCROLL =====
const sections = document.querySelectorAll('section');
const navLinkItems = document.querySelectorAll('.nav-links a');

window.addEventListener('scroll', () => {
    let current = '';
    sections.forEach(section => {
        const sectionTop = section.offsetTop - 150;
        if (scrollY >= sectionTop) {
            current = section.getAttribute('id');
        }
    });

    navLinkItems.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${current}`) {
            link.classList.add('active');
        }
    });
});

// ============================================
// 🖨️ PRINT UPLOAD SYSTEM
// ============================================

let selectedFiles = [];

// File input change
document.getElementById('fileInput').addEventListener('change', function(e) {
    selectedFiles = Array.from(this.files);
    updateFileList();
    updateCostEstimate();
});

// Drag and Drop
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
    // Reset input
    const input = document.getElementById('fileInput');
    input.value = '';
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

// Update cost on option change
document.getElementById('pagesPerCopy').addEventListener('change', updateCostEstimate);
document.getElementById('copies').addEventListener('change', updateCostEstimate);
document.getElementById('printColor').addEventListener('change', updateCostEstimate);

// Submit Print Job
function submitPrintJob(event) {
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

    // Simulate submission (In production, send to server or email)
    message.innerHTML = `
        ✅ Print job submitted successfully!<br>
        <strong>Files:</strong> ${selectedFiles.length}<br>
        <strong>Total Pages:</strong> ${totalPages}<br>
        <strong>Total Cost:</strong> KES ${total}<br>
        <small>You will be notified when your documents are ready.</small>
    `;
    message.className = 'form-message success';
    message.style.display = 'block';

    // Reset after 5 seconds
    setTimeout(() => {
        message.style.display = 'none';
    }, 8000);

    // Reset form
    selectedFiles = [];
    updateFileList();
    document.getElementById('fileInput').value = '';
    updateCostEstimate();

    // Track in Google Analytics
    gtag('event', 'print_job_submitted', {
        'event_category': 'Printing',
        'event_label': `${selectedFiles.length} files, KES ${total}`
    });

    // Add loyalty points
    addLoyaltyPoints('+254769357320', 5);
}

// ============================================
// 📅 BOOKING SYSTEM
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

function submitBooking(event) {
    event.preventDefault();
    const message = document.getElementById('bookingMessage');

    const computer = document.getElementById('bookingComputer').value;
    const dateTime = document.getElementById('bookingDateTime').value;
    const hours = document.getElementById('bookingHours').value;
    const name = document.getElementById('bookingName').value;
    const phone = document.getElementById('bookingPhone').value;
    const email = document.getElementById('bookingEmail').value;

    const rates = { '1': 50, '2': 50, '3': 50, '4': 50, 'gaming': 100 };
    const rate = rates[computer] || 0;
    const total = rate * hours;

    // Format date
    const date = new Date(dateTime);
    const formattedDate = date.toLocaleString('en-KE', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    message.innerHTML = `
        ✅ Booking confirmed!<br>
        <strong>Computer:</strong> ${computer === 'gaming' ? 'Gaming PC' : 'Computer ' + computer}<br>
        <strong>Date & Time:</strong> ${formattedDate}<br>
        <strong>Hours:</strong> ${hours}<br>
        <strong>Total Cost:</strong> KES ${total}<br>
        <strong>Customer:</strong> ${name} (${phone})<br>
        <small>Please arrive 5 minutes before your booking.</small>
    `;
    message.className = 'form-message success';
    message.style.display = 'block';

    // Reset form
    document.getElementById('bookingForm').reset();
    document.getElementById('bookingCost').textContent = 'KES 0';

    setTimeout(() => {
        message.style.display = 'none';
    }, 8000);

    // Track in Google Analytics
    gtag('event', 'computer_booking', {
        'event_category': 'Booking',
        'event_label': `Computer ${computer}, ${hours}h, KES ${total}`
    });

    // Add loyalty points
    addLoyaltyPoints(phone, 10);
}

// ============================================
// ⭐ LOYALTY PROGRAM
// ============================================

// Simple in-memory loyalty database (in production, use server/database)
const loyaltyDB = {};

function addLoyaltyPoints(phone, points) {
    if (!loyaltyDB[phone]) {
        loyaltyDB[phone] = { points: 0, visits: 0 };
    }
    loyaltyDB[phone].points += points;
    loyaltyDB[phone].visits += 1;

    // Show notification
    const total = loyaltyDB[phone].points;
    if (total >= 50) {
        setTimeout(() => {
            alert(`🎉 You now have ${total} loyalty points! Check your rewards in the Loyalty Program section.`);
        }, 500);
    }
}

function checkPoints() {
    const phone = document.getElementById('pointsPhone').value.trim();
    const result = document.getElementById('pointsResult');

    if (!phone) {
        result.textContent = '⚠️ Please enter your phone number.';
        result.className = 'points-result error show';
        return;
    }

    if (loyaltyDB[phone]) {
        const data = loyaltyDB[phone];
        result.innerHTML = `
            <strong>📞 ${phone}</strong><br>
            Points: <strong>${data.points}</strong><br>
            Total Visits: ${data.visits}<br>
            ${getRewardMessage(data.points)}
        `;
        result.className = 'points-result success show';
    } else {
        result.innerHTML = `
            No points found for ${phone}.<br>
            <small>Earn points by using our services!</small>
        `;
        result.className = 'points-result error show';
    }
}

function getRewardMessage(points) {
    if (points >= 500) return '🏆 Eligible for FREE Passport Photos!';
    if (points >= 200) return '🎁 Eligible for FREE 2 hours Computer Rental!';
    if (points >= 100) return '🎁 Eligible for FREE 10 pages Printing!';
    if (points >= 50) return '🎁 Eligible for FREE 1 hour Internet!';
    return `📈 ${50 - points} more points for your first reward!`;
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
}, {
    threshold: 0.1
});

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
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

console.log('🚀 Cisco Printers Cybercafe - Baraton, Nandi');
console.log('📧 info@ciscoprinters.co.ke');
console.log('⭐ Loyalty program active!');
console.log('🖨️ Print upload ready!');
console.log('📅 Booking system ready!');