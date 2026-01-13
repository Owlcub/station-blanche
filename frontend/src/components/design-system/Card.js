import React from 'react';
import './Card.css';

const Card = ({
  children,
  title,
  subtitle,
  icon: Icon,
  actions,
  variant = 'default',
  className = '',
  ...props
}) => {
  return (
    <div className={`card card-${variant} ${className}`} {...props}>
      {(title || Icon || actions) && (
        <div className="card-header">
          <div className="card-header-content">
            {Icon && <Icon className="card-icon" size={20} />}
            <div className="card-header-text">
              {title && <h3 className="card-title">{title}</h3>}
              {subtitle && <p className="card-subtitle">{subtitle}</p>}
            </div>
          </div>
          {actions && <div className="card-actions">{actions}</div>}
        </div>
      )}
      <div className="card-body">{children}</div>
    </div>
  );
};

export default Card;
