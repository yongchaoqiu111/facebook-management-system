document.addEventListener('DOMContentLoaded', function() {
    const transactions = [
        '55*****2584 acabou de receber R$36.00 no Pix💸',
        '55*****1067 acabou de receber R$79.00 no Pix💸',
        '55*****5714 acabou de receber R$73.00 no Pix💸',
        '55*****0590 acabou de receber R$20.00 no Pix💸',
        '55*****9788 acabou de receber R$47.00 no Pix💸',
        '55*****3723 acabou de receber R$61.00 no Pix💸',
        '55*****6089 acabou de receber R$51.00 no Pix💸',
        '55*****0767 acabou de receber R$32.00 no Pix💸',
        '55*****6271 acabou de receber R$89.00 no Pix💸',
        '55*****2055 acabou de receber R$100.00 no Pix💸',
        '55*****7685 acabou de receber R$86.00 no Pix💸',
        '55*****0439 acabou de receber R$42.00 no Pix💸'
    ];

    const transactionsList = document.getElementById('transactionsList');
    if (transactionsList) {
        function addTransaction() {
            const randomTransaction = transactions[Math.floor(Math.random() * transactions.length)];
            const transactionElement = document.createElement('div');
            transactionElement.className = 'transaction';
            transactionElement.textContent = randomTransaction;
            transactionsList.insertBefore(transactionElement, transactionsList.firstChild);
            
            if (transactionsList.children.length > 15) {
                transactionsList.removeChild(transactionsList.lastChild);
            }
        }
        
        setInterval(addTransaction, 3000);
    }

    const navLinks = document.querySelectorAll('.nav-links a');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            navLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');
        });
    });

    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            alert('Formulário enviado com sucesso!');
            this.reset();
        });
    });

    const buttons = document.querySelectorAll('.btn-secondary, .btn-primary, .btn-submit');
    buttons.forEach(button => {
        button.addEventListener('click', function() {
            if (this.textContent.includes('Fazer Tarefa')) {
                alert('Redirecionando para a tarefa...');
            } else if (this.textContent.includes('Solicitar Saque')) {
                alert('Saque solicitado! Aguarde a aprovação.');
            } else if (this.textContent.includes('Enviar Comprovação')) {
                alert('Comprovação enviada! Aguarde a verificação.');
            }
        });
    });

    window.addEventListener('scroll', function() {
        const header = document.querySelector('.header');
        if (window.scrollY > 50) {
            header.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
        } else {
            header.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
        }
    });

    const featureCards = document.querySelectorAll('.feature-card');
    featureCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-10px)';
        });
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
        });
    });

    function animateOnScroll() {
        const elements = document.querySelectorAll('.feature-card, .step');
        elements.forEach(element => {
            const elementTop = element.getBoundingClientRect().top;
            const elementVisible = 150;
            if (elementTop < window.innerHeight - elementVisible) {
                element.style.opacity = '1';
                element.style.transform = 'translateY(0)';
            }
        });
    }

    window.addEventListener('scroll', animateOnScroll);
    animateOnScroll();
});