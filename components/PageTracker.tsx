import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../services/api';

const PageTracker = () => {
    const location = useLocation();

    useEffect(() => {
        // Track visit on route change
        api.post('/api/analytics/visit', {
            page_path: location.pathname,
            referrer: document.referrer
        }).catch(console.error);
    }, [location.pathname]);

    return null;
};

export default PageTracker;
