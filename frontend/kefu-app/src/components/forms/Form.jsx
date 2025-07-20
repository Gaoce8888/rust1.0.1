import React, { createContext, useContext, useState, useCallback } from 'react';
import { clsx } from 'clsx';

// Form Context
const FormContext = createContext();

// 表单验证规则
const validators = {
  required: (value, message = '此字段为必填项') => {
    if (value === undefined || value === null || value === '') {
      return message;
    }
    return null;
  },
  
  minLength: (min, message) => (value) => {
    if (value && value.length < min) {
      return message || `最少需要${min}个字符`;
    }
    return null;
  },
  
  maxLength: (max, message) => (value) => {
    if (value && value.length > max) {
      return message || `最多允许${max}个字符`;
    }
    return null;
  },
  
  email: (value, message = '请输入有效的邮箱地址') => {
    if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return message;
    }
    return null;
  },
  
  phone: (value, message = '请输入有效的手机号码') => {
    if (value && !/^1[3-9]\d{9}$/.test(value)) {
      return message;
    }
    return null;
  },
  
  pattern: (regex, message) => (value) => {
    if (value && !regex.test(value)) {
      return message || '格式不正确';
    }
    return null;
  },
  
  min: (min, message) => (value) => {
    if (value !== undefined && value !== null && Number(value) < min) {
      return message || `最小值为${min}`;
    }
    return null;
  },
  
  max: (max, message) => (value) => {
    if (value !== undefined && value !== null && Number(value) > max) {
      return message || `最大值为${max}`;
    }
    return null;
  },
  
  custom: (fn) => fn
};

// 表单主组件
const Form = ({
  children,
  onSubmit,
  onValuesChange,
  initialValues = {},
  validateOnChange = true,
  validateOnBlur = true,
  className,
  ...props
}) => {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 验证单个字段
  const validateField = useCallback((name, value, rules = []) => {
    for (const rule of rules) {
      const error = rule(value);
      if (error) {
        return error;
      }
    }
    return null;
  }, []);

  // 验证所有字段
  const validateAll = useCallback((fieldsToValidate) => {
    const newErrors = {};
    
    fieldsToValidate.forEach(({ name, rules }) => {
      const error = validateField(name, values[name], rules);
      if (error) {
        newErrors[name] = error;
      }
    });
    
    return newErrors;
  }, [values, validateField]);

  // 设置字段值
  const setValue = useCallback((name, value) => {
    setValues(prev => {
      const newValues = { ...prev, [name]: value };
      onValuesChange?.(newValues, { ...prev });
      return newValues;
    });
  }, [onValuesChange]);

  // 设置字段错误
  const setFieldError = useCallback((name, error) => {
    setErrors(prev => ({
      ...prev,
      [name]: error
    }));
  }, []);

  // 清除字段错误
  const clearFieldError = useCallback((name) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[name];
      return newErrors;
    });
  }, []);

  // 设置字段已触摸状态
  const setFieldTouched = useCallback((name, touched = true) => {
    setTouched(prev => ({
      ...prev,
      [name]: touched
    }));
  }, []);

  // 重置表单
  const reset = useCallback((newValues = initialValues) => {
    setValues(newValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
  }, [initialValues]);

  // 提交表单
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // 收集所有字段的验证规则
      const formElements = Array.from(e.target.elements);
      const fieldsToValidate = [];
      
      formElements.forEach(element => {
        if (element.name && element.dataset.rules) {
          try {
            const rules = JSON.parse(element.dataset.rules);
            fieldsToValidate.push({ name: element.name, rules });
          } catch (err) {
            console.warn('Invalid validation rules for field:', element.name);
          }
        }
      });

      // 验证所有字段
      const validationErrors = validateAll(fieldsToValidate);
      
      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        return;
      }

      // 清除所有错误
      setErrors({});
      
      // 调用提交回调
      await onSubmit?.(values);
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const contextValue = {
    values,
    errors,
    touched,
    isSubmitting,
    setValue,
    setFieldError,
    clearFieldError,
    setFieldTouched,
    validateField,
    reset,
    validateOnChange,
    validateOnBlur
  };

  return (
    <FormContext.Provider value={contextValue}>
      <form
        onSubmit={handleSubmit}
        className={clsx('space-y-6', className)}
        {...props}
      >
        {children}
      </form>
    </FormContext.Provider>
  );
};

// 表单项组件
const FormItem = ({
  name,
  label,
  required = false,
  rules = [],
  help,
  className,
  children,
  ...props
}) => {
  const form = useContext(FormContext);
  
  if (!form) {
    throw new Error('FormItem must be used within a Form');
  }

  const { errors, touched } = form;
  const error = errors[name];
  const isTouched = touched[name];
  const showError = error && isTouched;

  // 为子组件添加验证规则
  const enhancedChildren = React.Children.map(children, child => {
    if (React.isValidElement(child) && child.props.name === name) {
      return React.cloneElement(child, {
        'data-rules': JSON.stringify(rules),
        status: showError ? 'error' : undefined,
        errorMessage: showError ? error : undefined
      });
    }
    return child;
  });

  return (
    <div className={clsx('space-y-2', className)} {...props}>
      {label && (
        <label
          htmlFor={name}
          className={clsx(
            'block text-sm font-medium',
            showError ? 'text-red-700' : 'text-gray-700'
          )}
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      {enhancedChildren}
      
      {help && !showError && (
        <p className="text-sm text-gray-500">{help}</p>
      )}
      
      {showError && (
        <p className="text-sm text-red-600 flex items-center">
          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
};

// 表单输入组件
const FormInput = React.forwardRef(({
  name,
  onChange,
  onBlur,
  ...props
}, ref) => {
  const form = useContext(FormContext);
  
  if (!form) {
    throw new Error('FormInput must be used within a Form');
  }

  const {
    values,
    setValue,
    setFieldError,
    clearFieldError,
    setFieldTouched,
    validateField,
    validateOnChange,
    validateOnBlur
  } = form;

  const handleChange = (e) => {
    const value = e.target.value;
    setValue(name, value);
    
    if (validateOnChange && props['data-rules']) {
      try {
        const rules = JSON.parse(props['data-rules']);
        const error = validateField(name, value, rules);
        if (error) {
          setFieldError(name, error);
        } else {
          clearFieldError(name);
        }
      } catch (err) {
        console.warn('Invalid validation rules for field:', name);
      }
    }
    
    onChange?.(e);
  };

  const handleBlur = (e) => {
    setFieldTouched(name, true);
    
    if (validateOnBlur && props['data-rules']) {
      try {
        const rules = JSON.parse(props['data-rules']);
        const error = validateField(name, e.target.value, rules);
        if (error) {
          setFieldError(name, error);
        } else {
          clearFieldError(name);
        }
      } catch (err) {
        console.warn('Invalid validation rules for field:', name);
      }
    }
    
    onBlur?.(e);
  };

  return (
    <input
      ref={ref}
      name={name}
      value={values[name] || ''}
      onChange={handleChange}
      onBlur={handleBlur}
      className={clsx(
        'w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm',
        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
        'disabled:bg-gray-50 disabled:text-gray-500',
        {
          'border-red-500 focus:ring-red-500 focus:border-red-500': props.status === 'error'
        }
      )}
      {...props}
    />
  );
});

// 表单文本域组件
const FormTextarea = React.forwardRef(({
  name,
  onChange,
  onBlur,
  rows = 4,
  ...props
}, ref) => {
  const form = useContext(FormContext);
  
  if (!form) {
    throw new Error('FormTextarea must be used within a Form');
  }

  const {
    values,
    setValue,
    setFieldError,
    clearFieldError,
    setFieldTouched,
    validateField,
    validateOnChange,
    validateOnBlur
  } = form;

  const handleChange = (e) => {
    const value = e.target.value;
    setValue(name, value);
    
    if (validateOnChange && props['data-rules']) {
      try {
        const rules = JSON.parse(props['data-rules']);
        const error = validateField(name, value, rules);
        if (error) {
          setFieldError(name, error);
        } else {
          clearFieldError(name);
        }
      } catch (err) {
        console.warn('Invalid validation rules for field:', name);
      }
    }
    
    onChange?.(e);
  };

  const handleBlur = (e) => {
    setFieldTouched(name, true);
    
    if (validateOnBlur && props['data-rules']) {
      try {
        const rules = JSON.parse(props['data-rules']);
        const error = validateField(name, e.target.value, rules);
        if (error) {
          setFieldError(name, error);
        } else {
          clearFieldError(name);
        }
      } catch (err) {
        console.warn('Invalid validation rules for field:', name);
      }
    }
    
    onBlur?.(e);
  };

  return (
    <textarea
      ref={ref}
      name={name}
      rows={rows}
      value={values[name] || ''}
      onChange={handleChange}
      onBlur={handleBlur}
      className={clsx(
        'w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm',
        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
        'disabled:bg-gray-50 disabled:text-gray-500 resize-vertical',
        {
          'border-red-500 focus:ring-red-500 focus:border-red-500': props.status === 'error'
        }
      )}
      {...props}
    />
  );
});

// 表单选择组件
const FormSelect = React.forwardRef(({
  name,
  onChange,
  onBlur,
  options = [],
  placeholder = '请选择',
  ...props
}, ref) => {
  const form = useContext(FormContext);
  
  if (!form) {
    throw new Error('FormSelect must be used within a Form');
  }

  const {
    values,
    setValue,
    setFieldError,
    clearFieldError,
    setFieldTouched,
    validateField,
    validateOnChange,
    validateOnBlur
  } = form;

  const handleChange = (e) => {
    const value = e.target.value;
    setValue(name, value);
    
    if (validateOnChange && props['data-rules']) {
      try {
        const rules = JSON.parse(props['data-rules']);
        const error = validateField(name, value, rules);
        if (error) {
          setFieldError(name, error);
        } else {
          clearFieldError(name);
        }
      } catch (err) {
        console.warn('Invalid validation rules for field:', name);
      }
    }
    
    onChange?.(e);
  };

  const handleBlur = (e) => {
    setFieldTouched(name, true);
    
    if (validateOnBlur && props['data-rules']) {
      try {
        const rules = JSON.parse(props['data-rules']);
        const error = validateField(name, e.target.value, rules);
        if (error) {
          setFieldError(name, error);
        } else {
          clearFieldError(name);
        }
      } catch (err) {
        console.warn('Invalid validation rules for field:', name);
      }
    }
    
    onBlur?.(e);
  };

  return (
    <select
      ref={ref}
      name={name}
      value={values[name] || ''}
      onChange={handleChange}
      onBlur={handleBlur}
      className={clsx(
        'w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm',
        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
        'disabled:bg-gray-50 disabled:text-gray-500',
        {
          'border-red-500 focus:ring-red-500 focus:border-red-500': props.status === 'error'
        }
      )}
      {...props}
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
});

// 表单复选框组件
const FormCheckbox = ({
  name,
  onChange,
  onBlur,
  children,
  ...props
}) => {
  const form = useContext(FormContext);
  
  if (!form) {
    throw new Error('FormCheckbox must be used within a Form');
  }

  const {
    values,
    setValue,
    setFieldTouched,
    validateField,
    setFieldError,
    clearFieldError,
    validateOnChange
  } = form;

  const handleChange = (e) => {
    const checked = e.target.checked;
    setValue(name, checked);
    
    if (validateOnChange && props['data-rules']) {
      try {
        const rules = JSON.parse(props['data-rules']);
        const error = validateField(name, checked, rules);
        if (error) {
          setFieldError(name, error);
        } else {
          clearFieldError(name);
        }
      } catch (err) {
        console.warn('Invalid validation rules for field:', name);
      }
    }
    
    onChange?.(e);
  };

  const handleBlur = (e) => {
    setFieldTouched(name, true);
    onBlur?.(e);
  };

  return (
    <label className="flex items-center">
      <input
        type="checkbox"
        name={name}
        checked={values[name] || false}
        onChange={handleChange}
        onBlur={handleBlur}
        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        {...props}
      />
      {children && (
        <span className="ml-2 text-sm text-gray-900">
          {children}
        </span>
      )}
    </label>
  );
};

// 使用表单的Hook
const useForm = () => {
  const context = useContext(FormContext);
  if (!context) {
    throw new Error('useForm must be used within a Form');
  }
  return context;
};

Form.displayName = 'Form';
FormItem.displayName = 'FormItem';
FormInput.displayName = 'FormInput';
FormTextarea.displayName = 'FormTextarea';
FormSelect.displayName = 'FormSelect';
FormCheckbox.displayName = 'FormCheckbox';

export {
  Form,
  FormItem,
  FormInput,
  FormTextarea,
  FormSelect,
  FormCheckbox,
  useForm,
  validators
};