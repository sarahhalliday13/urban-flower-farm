# Email System Guidelines

## System Architecture

### Primary System
- Firebase Functions + SendGrid
- Main email handling system
- Production environment

### Fallback System
- localStorage-based queue
- Backup when Firebase is unavailable
- Admin interface tracking

## Critical Requirements

1. **Notes Handling**
   - Must preserve notes in email templates
   - Customer pickup notes must be prominent
   - Notes must appear in both customer and admin emails
   - Proper formatting of notes required

2. **Firebase Listeners**
   - Must be properly cleaned up
   - Prevent memory leaks
   - Use proper unmounting procedures
   - Implement cleanup in useEffect

3. **Email Queue Management**
   - Track pending emails in localStorage
   - Admin dashboard warnings for pending emails
   - Manual email triggering capability
   - Status tracking for sent emails

## Implementation Details

1. **Firebase Functions**
   ```javascript
   // Proper cleanup example
   useEffect(() => {
     let isMounted = true;
     // Set up listeners...
     
     return () => {
       isMounted = false;
       // Clean up listeners...
     };
   }, []);
   ```

2. **Fallback System**
   - Store pending emails in `pendingOrderEmails`
   - Track manual emails in `manualEmails`
   - Display warnings in admin dashboard
   - Provide manual trigger interface

## Testing Requirements

Before deployment:
- Test primary email system
- Verify fallback system
- Check notes display
- Validate listener cleanup
- Test manual triggers

## Monitoring

1. **Email Status**
   - Track delivery success
   - Monitor failed sends
   - Log email attempts
   - Track queue status

2. **System Health**
   - Monitor Firebase Functions
   - Check listener cleanup
   - Track memory usage
   - Monitor queue length

## Important Notes

- Both systems must be maintained
- Notes handling is critical
- Clean up all listeners
- Test both systems regularly
- Monitor for failures
- Document all changes 